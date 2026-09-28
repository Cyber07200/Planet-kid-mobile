import Constants from 'expo-constants';

/**
 * Чтение конфигурации.
 *
 * Приоритет:
 *   1. process.env.EXPO_PUBLIC_* — переменные из .env
 *      (Expo подставляет их в бандл на этапе сборки)
 *   2. app.json -> expo.extra — запасной вариант
 *
 * Всё, что здесь лежит, попадает в клиентский бандл и считается
 * публичным. anon/publishable-ключ Supabase публичен по своей природе,
 * доступ к данным ограничивается политиками RLS. Настоящие секреты
 * (service_role key, ключи SMS-шлюза) живут только в Edge Functions.
 */

const extra = Constants?.expoConfig?.extra ?? {};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;

/*
 * Ошибку конфигурации не бросаем при импорте: App.js покажет
 * понятный экран вместо белого (исключение при загрузке модуля
 * роняло приложение раньше, чем этот экран успевал появиться).
 */
const getConfigError = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      'Не заданы EXPO_PUBLIC_SUPABASE_URL или EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Скопируйте .env.example в .env и заполните значения из веб-проекта.'
    );
  }

  if (!/^https?:\/\//i.test(supabaseUrl)) {
    return 'EXPO_PUBLIC_SUPABASE_URL должен начинаться с https://';
  }

  return null;
};

/*
 * Внешние ссылки открываются системой, поэтому пропускаем только
 * безопасные схемы: иначе опечатка или подмена в конфиге могла бы
 * открыть произвольный deep link другого приложения.
 */
const safeLink = (value) =>
  typeof value === 'string' && /^(https:\/\/|mailto:|tel:)/i.test(value.trim())
    ? value.trim()
    : null;

const policyUrl = safeLink(process.env.EXPO_PUBLIC_POLICY_URL || extra.policyUrl);

/*
 * Тестовый код подтверждения допустим только при разработке
 * или если его явно разрешили для внутренней тестовой сборки.
 * В релизе без SMS-шлюза вход по коду просто недоступен.
 */
const allowTestOtp =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_ALLOW_TEST_OTP === 'true';

export const env = {
  configError: getConfigError(),
  supabaseUrl: String(supabaseUrl ?? '').replace(/\/$/, ''),
  supabaseAnonKey,
  supportUrl: safeLink(process.env.EXPO_PUBLIC_SUPPORT_URL || extra.supportUrl),
  policyUrl,
  termsUrl: safeLink(process.env.EXPO_PUBLIC_TERMS_URL || extra.termsUrl) || policyUrl,
  allowTestOtp,
};
