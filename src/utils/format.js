/**
 * Форматирование чисел и склонения.
 */

/** «16.263 ₽» — формат из макета (точка как разделитель тысяч) */
export const formatMoney = (value) => {
  const amount = Number(value || 0);

  const rounded = Math.round(amount);

  const formatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted} ₽`;
};

/**
 * Русское склонение: plural(5, 'занятие', 'занятия', 'занятий')
 */
export const plural = (count, one, few, many) => {
  const number = Math.abs(Number(count) || 0) % 100;
  const remainder = number % 10;

  if (number > 10 && number < 20) {
    return many;
  }

  if (remainder > 1 && remainder < 5) {
    return few;
  }

  if (remainder === 1) {
    return one;
  }

  return many;
};


export const getFullName = (firstName, lastName) => {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

export const getInitials = (firstName, lastName) => {
  const first = String(firstName || '').trim().charAt(0);
  const last = String(lastName || '').trim().charAt(0);

  return `${first}${last}`.toUpperCase() || '?';
};


/**
 * Возрастная метка направления.
 *
 * В базе отдельного поля «возраст» нет — в макете рядом
 * с названием стоит «7+». Берём его из названия направления
 * (в базе они называются, например, «Программирование 7+»),
 * а если там ничего нет — не показываем ничего.
 */
export const extractAgeLabel = (name) => {
  const match = /(\d{1,2})\s*\+/.exec(String(name || ''));

  return match ? `${match[1]}+` : '';
};

/** Название направления без возрастной метки */
export const stripAgeLabel = (name) => {
  return String(name || '')
    .replace(/\s*\d{1,2}\s*\+\s*$/, '')
    .trim();
};

/** Приветствие по времени суток — как на сайте */
export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Доброе утро';
  }

  if (hour < 18) {
    return 'Добрый день';
  }

  return 'Добрый вечер';
};

/**
 * Supabase при join'ах иногда отдаёт объект,
 * а иногда массив из одного элемента.
 * На сайте для этого есть normalizeRelation — повторяем.
 */
export const normalizeRelation = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};
