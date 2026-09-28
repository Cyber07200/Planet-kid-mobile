import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { fetchWithTimeout, readJson } from '../utils/http';
import { formatPhoneForDatabase, isValidPhone } from '../utils/phone';

/**
 * Отправка и проверка кода подтверждения по SMS.
 *
 * Режим определяется при первом обращении и запоминается:
 *
 *   gateway — свой SMS-шлюз через Edge Function `send-sms-code`
 *             (SMS.ru / SMSC.ru). Основной рабочий режим.
 *   auth    — встроенный phone-provider Supabase Auth.
 *   dev     — SMS отправить некому, подходит тестовый код.
 *             Доступен только при разработке или с явным
 *             EXPO_PUBLIC_ALLOW_TEST_OTP=true (см. config/env.js).
 *
 * Как включить настоящую отправку — см. supabase/README.md.
 */

export const OTP_MODES = {
  GATEWAY: 'gateway',
  AUTH: 'auth',
  DEV: 'dev',
};

/** Тестовый код — тот же, что использует веб-версия */
const DEV_CODE = '1234';

const CODE_LENGTH = 4;
const AUTH_CODE_LENGTH = 6;
const DEFAULT_RETRY_AFTER = 60;

const functionsUrl = `${env.supabaseUrl}/functions/v1`;

const jsonHeaders = {
  'Content-Type': 'application/json',
  apikey: env.supabaseAnonKey,
  Authorization: `Bearer ${env.supabaseAnonKey}`,
};

/*
 * OPTIONS-запрос не отправляет SMS. Сетевую ошибку не глушим:
 * раньше обрыв связи выглядел как «шлюза нет» и молча включал
 * тестовый код 1234 до конца сессии.
 */
const hasSmsGateway = async () => {
  const response = await fetchWithTimeout(`${functionsUrl}/send-sms-code`, {
    method: 'OPTIONS',
    headers: { apikey: env.supabaseAnonKey },
  });

  return response.status !== 404;
};

const hasAuthPhoneProvider = async () => {
  const response = await fetchWithTimeout(`${env.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: env.supabaseAnonKey },
  });

  if (!response.ok) {
    return false;
  }

  const settings = await readJson(response);

  return Boolean(settings?.external?.phone);
};

const resolveMode = async () => {
  if (await hasSmsGateway()) {
    return OTP_MODES.GATEWAY;
  }

  if (await hasAuthPhoneProvider()) {
    return OTP_MODES.AUTH;
  }

  if (env.allowTestOtp) {
    return OTP_MODES.DEV;
  }

  throw new Error(
    'Подтверждение по SMS временно недоступно. Обратитесь к администратору центра.',
  );
};

let modePromise = null;

/* Неудачное определение не запоминаем — следующая попытка повторит его */
const detectMode = () => {
  if (!modePromise) {
    modePromise = resolveMode().catch((error) => {
      modePromise = null;
      throw error;
    });
  }

  return modePromise;
};

const postToFunction = async (name, body) => {
  const response = await fetchWithTimeout(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });

  return { response, payload: await readJson(response) };
};

const toDatabasePhone = (rawPhone) => {
  if (!isValidPhone(rawPhone)) {
    throw new Error('Введите корректный номер телефона');
  }

  return formatPhoneForDatabase(rawPhone);
};

const sendViaGateway = async (phone) => {
  const { response, payload } = await postToFunction('send-sms-code', { phone });

  if (response.status === 429) {
    const retryAfter = Number(payload?.retryAfter ?? DEFAULT_RETRY_AFTER);

    throw Object.assign(
      new Error(`Код уже отправлен. Повторить можно через ${retryAfter} сек.`),
      { retryAfter },
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Не удалось отправить код подтверждения',
    );
  }

  return {
    codeLength: Number(payload?.codeLength ?? CODE_LENGTH),
    retryAfter: Number(payload?.retryAfter ?? DEFAULT_RETRY_AFTER),
  };
};

const verifyViaGateway = async (phone, code) => {
  const { response, payload } = await postToFunction('verify-sms-code', { phone, code });

  if (response.ok && payload?.verified) {
    return true;
  }

  if (response.status === 410) {
    throw new Error('Срок действия кода истёк. Запросите новый.');
  }

  if (response.status === 429) {
    throw new Error('Слишком много попыток. Запросите новый код.');
  }

  return false;
};

export const OtpService = {
  /**
   * @returns {{ mode, phone, codeLength, retryAfter }}
   */
  async sendCode(rawPhone) {
    const phone = toDatabasePhone(rawPhone);
    const mode = await detectMode();

    if (mode === OTP_MODES.GATEWAY) {
      return { mode, phone, ...(await sendViaGateway(phone)) };
    }

    if (mode === OTP_MODES.AUTH) {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true },
      });

      if (error) {
        throw new Error('Не удалось отправить код подтверждения');
      }

      return { mode, phone, codeLength: AUTH_CODE_LENGTH, retryAfter: DEFAULT_RETRY_AFTER };
    }

    return { mode, phone, codeLength: CODE_LENGTH, retryAfter: DEFAULT_RETRY_AFTER };
  },

  /**
   * @returns {Promise<boolean>} true, если код верный
   */
  async verifyCode(rawPhone, code) {
    const phone = toDatabasePhone(rawPhone);
    const value = String(code || '').replace(/\D/g, '').slice(0, AUTH_CODE_LENGTH);

    if (!value) {
      return false;
    }

    const mode = await detectMode();

    if (mode === OTP_MODES.GATEWAY) {
      return verifyViaGateway(phone, value);
    }

    if (mode === OTP_MODES.AUTH) {
      const { error } = await supabase.auth.verifyOtp({ phone, token: value, type: 'sms' });

      if (!error) {
        return true;
      }

      /* Неверный код — обычный результат, а не сбой */
      if (/invalid|expired|token/i.test(error.message || '')) {
        return false;
      }

      throw new Error('Не удалось проверить код');
    }

    return value === DEV_CODE;
  },
};
