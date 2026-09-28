/**
 * Работа с датами.
 *
 * Формулы перенесены из веб-проекта
 * (CalendarPage.tsx, DirectionsPage.tsx, ProfilePage.tsx),
 * чтобы даты занятий совпадали с теми, что пишет сайт.
 */

export const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/* Индекс = ISO-день недели (1 = понедельник) */
export const DAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const DAY_UPPER = ['', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
export const DAY_FULL = [
  '',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const getStartOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/** YYYY-MM-DD — формат, в котором даты лежат в базе */
export const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const parseDateKey = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = String(value).split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getMonday = (date) => {
  const result = getStartOfDay(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);

  return result;
};

/** ISO-день недели: понедельник = 1, воскресенье = 7 */
export const getIsoDay = (date) => {
  const day = date.getDay();

  return day === 0 ? 7 : day;
};

/**
 * Ближайшая дата с указанным днём недели.
 *
 * Сегодняшний день подходит, но только если занятие ещё не началось:
 * если слот стоит на сегодня в 16:00, а сейчас 18:00, записываться
 * на него уже поздно — берём следующую неделю.
 *
 * @param {number} dayOfWeek день недели, 1 — понедельник, 7 — воскресенье
 * @param {string} [startTime] время начала занятия, «16:00:00»
 */
export const getNextDateForDay = (dayOfWeek, startTime = null) => {
  const now = new Date();
  const today = getStartOfDay(now);
  const currentDay = getIsoDay(today);

  let diff = dayOfWeek - currentDay;

  if (diff < 0) {
    diff += 7;
  }

  /* Занятие сегодня — проверяем, не прошло ли уже время начала */
  if (diff === 0 && startTime) {
    const [hours, minutes] = String(startTime).split(':');

    const start = new Date(today);

    start.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);

    if (start <= now) {
      diff = 7;
    }
  }

  return addDays(today, diff);
};

/** Дата из объекта Date или строки YYYY-MM-DD */
const toDate = (value) => (typeof value === 'string' ? parseDateKey(value) : value);

/** 'today' | 'tomorrow' | null — для подписей «Сегодня» / «Завтра» */
const getNearDay = (date) => {
  const key = formatDateKey(date);
  const today = getStartOfDay(new Date());

  if (key === formatDateKey(today)) {
    return 'today';
  }

  return key === formatDateKey(addDays(today, 1)) ? 'tomorrow' : null;
};

const NEAR_DAY_LABELS = { today: 'Сегодня', tomorrow: 'Завтра' };

const pad2 = (value) => String(value).padStart(2, '0');

/** «16:00» из «16:00:00» */
export const formatTime = (time) => {
  if (!time) {
    return '';
  }

  return String(time).slice(0, 5);
};

/** «24 января» */
export const formatDayMonth = (date) => {
  if (!date) {
    return '';
  }

  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
};

/** «24 января 2026 г.» */
export const formatFullDate = (date) => {
  if (!date) {
    return '';
  }

  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Заголовок выбранного дня в расписании:
 * «Сегодня, 14 сентября», «Завтра, 15 сентября»,
 * «Понедельник, 16 сентября».
 *
 * Для сегодня и завтра показываем привычные слова —
 * так же, как в макете, — но с датой, чтобы было понятно,
 * какой именно день выбран.
 */
export const formatSelectedDayLabel = (value) => {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  const prefix = NEAR_DAY_LABELS[getNearDay(date)] ?? DAY_FULL[getIsoDay(date)];

  return `${prefix}, ${formatDayMonth(date)}`;
};

/** «Январь, 24» — заголовок группы в календаре по макету */
export const formatMonthDay = (date) => {
  if (!date) {
    return '';
  }

  return `${MONTHS[date.getMonth()]}, ${date.getDate()}`;
};

/** «18.02» — короткая дата для виджета подписки */
export const formatShortDate = (value) => {
  const date = toDate(value);

  return date ? `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}` : '';
};

/** «01.01.2016» */
export const formatDotDate = (value) => {
  const date = toDate(value);

  return date ? `${formatShortDate(date)}.${date.getFullYear()}` : '';
};


/** Заголовок группы в календаре: Сегодня / Завтра / Январь, 24 */
export const getRelativeDayLabel = (value) => {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  return NEAR_DAY_LABELS[getNearDay(date)] ?? formatMonthDay(date);
};

export const calculateAge = (birthDate) => {
  const birth = parseDateKey(birthDate);

  if (!birth) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
};

export const getTodayKey = () => formatDateKey(getStartOfDay(new Date()));

/** Первый день месяца указанной даты, YYYY-MM-01 */
export const getMonthStartKey = (date = new Date()) =>
  formatDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
