// Проверка кода подтверждения.
//
// Сравнивается хеш присланного кода с последним выданным
// для этого номера. Учитываются срок жизни, число попыток
// и то, что код одноразовый.

import {
  createAdminClient,
  json,
  normalizePhone,
  readRequest,
  safeEqual,
  sha256,
} from '../_shared/http.ts';

const MAX_ATTEMPTS = 5;

Deno.serve(async (request) => {
  const parsed = await readRequest(request);

  if ('response' in parsed) {
    return parsed.response;
  }

  const phone = normalizePhone(parsed.body.phone);
  const code = String(parsed.body.code ?? '').trim();

  if (!phone || !/^\d{4,8}$/.test(code)) {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  const supabase = createAdminClient();

  const { data: entry, error } = await supabase
    .from('phone_codes')
    .select('id, code_hash, salt, attempts, expires_at, verified')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('verify-sms-code: ошибка чтения кода', error.code);
    return json({ error: 'Внутренняя ошибка' }, 500);
  }

  // Использованный код повторно не принимается
  if (!entry || entry.verified) {
    return json({ verified: false, error: 'Код не запрашивался' }, 400);
  }

  if (new Date(entry.expires_at).getTime() < Date.now()) {
    return json({ verified: false, error: 'Срок действия кода истёк' }, 410);
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return json({ verified: false, error: 'Слишком много попыток' }, 429);
  }

  const verified = safeEqual(await sha256(`${entry.salt}:${code}`), entry.code_hash);
  const attempts = entry.attempts + 1;

  await supabase.from('phone_codes').update({ verified, attempts }).eq('id', entry.id);

  if (!verified) {
    return json({ verified: false, attemptsLeft: Math.max(MAX_ATTEMPTS - attempts, 0) });
  }

  return json({ verified: true });
});
