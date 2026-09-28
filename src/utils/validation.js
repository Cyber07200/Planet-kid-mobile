import { getStartOfDay, parseDateKey } from './date';

/**
 * Проверка пользовательского ввода перед отправкой в базу.
 *
 * Интерфейс и так ограничивает поля, но сервисы не доверяют ему:
 * данные могут прийти из черновика, параметров навигации или
 * устаревшего кэша.
 */

export const NAME_MAX_LENGTH = 50;

/* Управляющие символы и разметка в имени — признак мусора или подстановки */
const FORBIDDEN_NAME_CHARS = /[<>{}[\]\\\u0000-\u001F\u007F]/;

/** «  Иван   Петров » → «Иван Петров», с ограничением длины */
export const cleanName = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX_LENGTH);

export const isValidName = (value) => {
  const name = cleanName(value);

  return name.length > 0 && !FORBIDDEN_NAME_CHARS.test(name);
};

const GENDERS = ['male', 'female'];

/** Пол ребёнка: только значения, которые понимает база, иначе null */
export const cleanGender = (value) => (GENDERS.includes(value) ? value : null);

/** Дата рождения: корректная YYYY-MM-DD, не в будущем и не раньше 1900 года */
export const isValidBirthDate = (value) => {
  const date = parseDateKey(value);

  if (!date || date.getFullYear() < 1900) {
    return false;
  }

  return date <= getStartOfDay(new Date());
};

/**
 * Экранирование спецсимволов шаблона ILIKE.
 *
 * Без него ввод «% %» совпал бы с любым преподавателем.
 */
export const escapeLikePattern = (value) => String(value ?? '').replace(/[\\%_]/g, '\\$&');

/** id из хранилища или параметров: без спецсимволов фильтров PostgREST */
export const isSafeId = (value) =>
  (typeof value === 'string' && /^[\w-]{1,64}$/.test(value)) ||
  (Number.isInteger(value) && value > 0);
