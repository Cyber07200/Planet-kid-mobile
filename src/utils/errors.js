/**
 * Понятные тексты ошибок вместо сырых ответов PostgREST и сети.
 */

const ERROR_TEXTS = {
  '23505': 'Такая запись уже существует.',
  '23503': 'Нельзя выполнить действие: есть связанные записи.',
  '42501': 'Недостаточно прав для выполнения операции.',
  '23514': 'Данные не прошли проверку на сервере.',
  '22P02': 'Некорректный формат данных.',
  PGRST116: 'Запись не найдена.',
};

/*
 * Технические сообщения PostgREST и Postgres пользователю ничего
 * не говорят и раскрывают устройство базы — их не показываем.
 */
const TECHNICAL_MESSAGE =
  /PGRST|relation |column |duplicate key|violates|JWT|schema cache|syntax|enum|null value|permission denied|function /i;

/**
 * Единая обработка ошибок Supabase: человекочитаемое сообщение
 * на русском вместо сырых ошибок PostgREST.
 */
export const describeSupabaseError = (error, fallback = 'Что-то пошло не так') => {
  if (!error) {
    return fallback;
  }

  const message = String(error.message || '');

  if (
    error.name === 'AbortError' ||
    /Network request failed|Failed to fetch|aborted/i.test(message)
  ) {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова.';
  }

  if (ERROR_TEXTS[error.code]) {
    return ERROR_TEXTS[error.code];
  }

  if (message.includes('row-level security')) {
    return ERROR_TEXTS['42501'];
  }

  if (/timeout|timed out/i.test(message)) {
    return 'Сервер не ответил вовремя. Попробуйте ещё раз.';
  }

  /*
   * У ошибок базы есть code — их текст пользователю не показываем.
   * Исключение — P0001: это RAISE EXCEPTION из триггеров базы,
   * там текст пишут специально для человека.
   */
  const isDatabaseError = Boolean(error.code) && error.code !== 'P0001';

  if (!message || isDatabaseError || TECHNICAL_MESSAGE.test(message)) {
    return fallback;
  }

  return message;
};
