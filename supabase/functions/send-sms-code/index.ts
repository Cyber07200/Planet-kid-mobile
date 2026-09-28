// Отправка кода подтверждения по SMS.
//
// Код генерируется здесь, в базу пишется только его хеш с солью,
// а сам код уходит в SMS через выбранный шлюз. Клиент код не получает.
//
// Провайдер задаётся переменной SMS_PROVIDER (обязательна):
//   smsru  — sms.ru       (SMSRU_API_ID)
//   smsc   — smsc.ru      (SMSC_LOGIN, SMSC_PASSWORD)
//   log    — ничего не отправляет, пишет код в логи (только для отладки)

import { createAdminClient, json, normalizePhone, readRequest, sha256 } from '../_shared/http.ts';

const CODE_LENGTH = 4;
const CODE_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

const randomDigits = (length: number) => {
  // 4 байта на цифру: остаток от деления 2^32 на 10 даёт
  // пренебрежимо малый перекос, в отличие от одного байта.
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => String(value % 10)).join('');
};

const buildMessage = (code: string) => `${code} — код подтверждения. Дети на планете`;

const postForm = async (url: string, params: URLSearchParams) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  return response.json();
};

const sendViaSmsRu = async (phone: string, code: string) => {
  const apiId = Deno.env.get('SMSRU_API_ID');

  if (!apiId) {
    throw new Error('Не задан SMSRU_API_ID');
  }

  const to = phone.replace('+', '');
  const params = new URLSearchParams({ api_id: apiId, to, msg: buildMessage(code), json: '1' });
  const from = Deno.env.get('SMS_FROM');

  if (from) {
    params.set('from', from);
  }

  const result = await postForm('https://sms.ru/sms/send', params);
  const entry = result.sms?.[to];

  if (result.status !== 'OK' || (entry && entry.status !== 'OK')) {
    throw new Error(`sms.ru: ${entry?.status_code ?? result.status_code}`);
  }
};

const sendViaSmsc = async (phone: string, code: string) => {
  const login = Deno.env.get('SMSC_LOGIN');
  const password = Deno.env.get('SMSC_PASSWORD');

  if (!login || !password) {
    throw new Error('Не заданы SMSC_LOGIN / SMSC_PASSWORD');
  }

  const params = new URLSearchParams({
    login,
    psw: password,
    phones: phone,
    mes: buildMessage(code),
    fmt: '3',
    charset: 'utf-8',
  });

  const sender = Deno.env.get('SMS_FROM');

  if (sender) {
    params.set('sender', sender);
  }

  const result = await postForm('https://smsc.ru/sys/send.php', params);

  if (result.error) {
    throw new Error(`smsc.ru: ${result.error_code ?? 'ошибка'}`);
  }
};

const PROVIDERS: Record<string, (phone: string, code: string) => Promise<void>> = {
  smsru: sendViaSmsRu,
  smsc: sendViaSmsc,
  // Отладка: SMS не уходит, код виден в логах функции.
  // Номер маскируем — логи читают не только разработчики.
  log: async (phone, code) => {
    console.log(`[send-sms-code] ${phone.slice(0, 4)}***${phone.slice(-2)} -> ${code}`);
  },
};

Deno.serve(async (request) => {
  const parsed = await readRequest(request);

  if ('response' in parsed) {
    return parsed.response;
  }

  // Без явно выбранного провайдера не делаем вид, что SMS ушло
  const provider = PROVIDERS[(Deno.env.get('SMS_PROVIDER') ?? '').toLowerCase()];

  if (!provider) {
    console.error('send-sms-code: не задан SMS_PROVIDER');
    return json({ error: 'Отправка SMS не настроена' }, 503);
  }

  const phone = normalizePhone(parsed.body.phone);

  if (!phone) {
    return json({ error: 'Некорректный номер телефона' }, 400);
  }

  const supabase = createAdminClient();
  const now = Date.now();

  // Не чаще одного кода в минуту и не больше пяти в час на номер
  const { data: recent, error: recentError } = await supabase
    .from('phone_codes')
    .select('id, created_at')
    .eq('phone', phone)
    .gte('created_at', new Date(now - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (recentError) {
    console.error('send-sms-code: ошибка чтения phone_codes', recentError.code);
    return json({ error: 'Внутренняя ошибка' }, 500);
  }

  if (recent && recent.length > 0) {
    const elapsed = Math.floor((now - new Date(recent[0].created_at).getTime()) / 1000);

    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return json(
        { error: 'Код уже отправлен', retryAfter: RESEND_COOLDOWN_SECONDS - elapsed },
        429,
      );
    }

    if (recent.length >= MAX_SENDS_PER_HOUR) {
      return json({ error: 'Слишком много запросов. Попробуйте позже.', retryAfter: 3600 }, 429);
    }
  }

  const code = randomDigits(CODE_LENGTH);
  const salt = crypto.randomUUID();

  const { error: insertError } = await supabase.from('phone_codes').insert({
    phone,
    code_hash: await sha256(`${salt}:${code}`),
    salt,
    expires_at: new Date(now + CODE_TTL_SECONDS * 1000).toISOString(),
  });

  if (insertError) {
    console.error('send-sms-code: ошибка записи кода', insertError.code);
    return json({ error: 'Внутренняя ошибка' }, 500);
  }

  try {
    await provider(phone, code);
  } catch (error) {
    console.error('send-sms-code: ошибка отправки SMS', (error as Error).message);
    return json({ error: 'Не удалось отправить SMS. Попробуйте позже.' }, 502);
  }

  return json({
    sent: true,
    codeLength: CODE_LENGTH,
    retryAfter: RESEND_COOLDOWN_SECONDS,
    expiresIn: CODE_TTL_SECONDS,
  });
});
