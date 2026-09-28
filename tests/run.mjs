/**
 * Проверки чистой логики приложения — на настоящих файлах src.
 *
 * Запуск: node --import ./tests/setup.mjs tests/run.mjs
 */
import assert from 'node:assert/strict';

import {
  DAY_SHORT,
  addDays,
  calculateAge,
  formatDateKey,
  formatDotDate,
  formatSelectedDayLabel,
  formatTime,
  getIsoDay,
  getMonday,
  getNextDateForDay,
  getRelativeDayLabel,
  getStartOfDay,
  parseDateKey,
} from '../src/utils/date.js';

import {
  extractAgeLabel,
  formatMoney,
  getFullName,
  plural,
  stripAgeLabel,
} from '../src/utils/format.js';

import {
  formatPhoneForDatabase,
  formatPhoneForDisplay,
  isValidPhone,
  normalizePhone,
} from '../src/utils/phone.js';

import {
  isActiveBooking,
  isCancelledStatus,
  isSubscriptionActive,
  mergeBookings,
} from '../src/utils/status.js';

import {
  buildBookingNotification,
  buildCancelNotification,
  joinNames,
} from '../src/utils/notify.js';

import {
  EMPTY_FILTERS,
  buildPlanFilters,
  countActiveFilters,
  filterDirections,
  getDirectionMinAge,
} from '../src/utils/filters.js';

import {
  buildCalendarEvents,
  getBookingRange,
  getDateRange,
  groupEventsByDate,
} from '../src/services/calendar.js';

import {
  getCalculatedPrice,
  getDiscountPercent,
  getTotalPrice,
} from '../src/services/subscriptions.service.js';

let passed = 0;

const check = (label, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${label}\n  ${error.message}`);
    process.exitCode = 1;
  }
};

/* --------------------------- Даты --------------------------- */

check('formatDateKey / parseDateKey — без сдвига часового пояса', () => {
  const key = '2026-01-24';
  assert.equal(formatDateKey(parseDateKey(key)), key);
  assert.equal(parseDateKey(key).getDate(), 24);
});

check('getIsoDay: воскресенье — 7, понедельник — 1', () => {
  assert.equal(getIsoDay(parseDateKey('2026-01-25')), 7);
  assert.equal(getIsoDay(parseDateKey('2026-01-26')), 1);
  assert.equal(DAY_SHORT[getIsoDay(parseDateKey('2026-01-26'))], 'Пн');
});

check('getMonday возвращает понедельник этой же недели', () => {
  assert.equal(formatDateKey(getMonday(parseDateKey('2026-01-25'))), '2026-01-19');
  assert.equal(formatDateKey(getMonday(parseDateKey('2026-01-19'))), '2026-01-19');
  assert.equal(formatDateKey(getMonday(parseDateKey('2026-01-24'))), '2026-01-19');
});

check('addDays не ломается на границе месяца', () => {
  assert.equal(formatDateKey(addDays(parseDateKey('2026-01-31'), 1)), '2026-02-01');
  assert.equal(formatDateKey(addDays(parseDateKey('2026-02-28'), 1)), '2026-03-01');
});

check('formatTime отрезает секунды', () => {
  assert.equal(formatTime('16:00:00'), '16:00');
  assert.equal(formatTime('09:30'), '09:30');
});

check('formatDotDate — дд.мм.гггг', () => {
  assert.equal(formatDotDate('2016-03-07'), '07.03.2016');
});

check('calculateAge считает по прошедшему дню рождения', () => {
  const now = new Date();
  const year = now.getFullYear();
  const born = new Date(year - 8, now.getMonth(), now.getDate());
  assert.equal(calculateAge(formatDateKey(born)), 8);
});

check('getRelativeDayLabel: сегодня и завтра', () => {
  const today = new Date();
  assert.equal(getRelativeDayLabel(formatDateKey(today)), 'Сегодня');
  assert.equal(getRelativeDayLabel(formatDateKey(addDays(today, 1))), 'Завтра');
});

/* ---------------- Недельная лента календаря ---------------- */

check('лента недель покрывает весь горизонт записи', () => {
  const range = getBookingRange(parseDateKey('2026-01-22'));

  const weeks = [];

  for (
    let start = getMonday(range.today);
    start <= range.maxDate;
    start = addDays(start, 7)
  ) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)));
  }

  /* первая неделя начинается с понедельника */
  assert.equal(getIsoDay(weeks[0][0]), 1);
  assert.equal(getIsoDay(weeks[0][6]), 7);

  /* сегодня попадает в первую неделю */
  const keys = weeks.flat().map(formatDateKey);
  assert.ok(keys.includes(range.todayKey));

  /* последний день горизонта тоже попадает */
  assert.ok(keys.includes(range.maxDateKey));

  /* недели идут подряд, без дыр */
  for (let index = 1; index < weeks.length; index += 1) {
    assert.equal(
      formatDateKey(weeks[index][0]),
      formatDateKey(addDays(weeks[index - 1][6], 1)),
    );
  }
});

check('getDateRange — все даты горизонта по порядку', () => {
  const from = parseDateKey('2026-01-22');
  const to = parseDateKey('2026-01-25');
  const dates = getDateRange(from, to).map(formatDateKey);

  assert.deepEqual(dates, [
    '2026-01-22',
    '2026-01-23',
    '2026-01-24',
    '2026-01-25',
  ]);
});

/* ------------------- Расписание → занятия ------------------- */

const activity = {
  id: 'a1',
  name: 'Рисование 6+',
  durationMinutes: 45,
  maxPlaces: 5,
  isActive: true,
};

const makeGroupSchedule = (overrides = {}) => ({
  id: 'g1',
  activityTypeId: 'a1',
  dayOfWeek: 1,
  startTime: '16:00:00',
  endTime: '16:45:00',
  activity,
  teacher: { firstName: 'Евгений', lastName: 'Викторович' },
  ...overrides,
});

const buildFor = (dateKeys, options = {}) =>
  buildCalendarEvents({
    groupSchedules: [makeGroupSchedule(options.schedule)],
    individualSchedules: [],
    groupBookings: options.bookings ?? [],
    individualBookings: [],
    groupCancellations: options.cancellations ?? [],
    individualCancellations: [],
    children: options.children ?? [],
    dates: dateKeys.map(parseDateKey),
  });

check('занятие появляется только в свой день недели', () => {
  const events = buildFor([
    '2026-01-19', // Пн
    '2026-01-20', // Вт
    '2026-01-26', // Пн
  ]);

  assert.deepEqual(
    events.map((event) => event.lessonDate),
    ['2026-01-19', '2026-01-26'],
  );
});

check('занятые места вычитаются из свободных', () => {
  const events = buildFor(['2026-01-19'], {
    bookings: [
      { id: 'b1', scheduleId: 'g1', lessonDate: '2026-01-19', status: 'booked', childId: 'c1' },
      { id: 'b2', scheduleId: 'g1', lessonDate: '2026-01-19', status: 'confirmed', childId: 'c2' },
      { id: 'b3', scheduleId: 'g1', lessonDate: '2026-01-19', status: 'cancelled', childId: 'c3' },
    ],
  });

  assert.equal(events[0].spotsLeft, 3);
});

check('отменённое занятие помечается как отменённое', () => {
  const events = buildFor(['2026-01-19'], {
    cancellations: [{ scheduleId: 'g1', lessonDate: '2026-01-19' }],
  });

  assert.equal(events[0].cancelled, true);
});

check('запись своего ребёнка видна в занятии', () => {
  const events = buildFor(['2026-01-19'], {
    children: [{ id: 'c1', firstName: 'Даня' }],
    bookings: [
      { id: 'b1', scheduleId: 'g1', lessonDate: '2026-01-19', status: 'booked', childId: 'c1' },
    ],
  });

  assert.deepEqual(events[0].bookedChildIds, ['c1']);
});

check('groupEventsByDate группирует по дате', () => {
  const events = buildFor(['2026-01-19', '2026-01-26']);
  const grouped = groupEventsByDate(events);

  assert.equal(grouped.size, 2);
  assert.equal(grouped.get('2026-01-19').length, 1);
});

/* ----------------------- Возраст и имя ---------------------- */

check('возраст отделяется от названия', () => {
  assert.equal(extractAgeLabel('Рисование 6+'), '6+');
  assert.equal(stripAgeLabel('Рисование 6+'), 'Рисование');
  assert.equal(extractAgeLabel('Театр'), '');
});

check('склонения', () => {
  assert.equal(plural(1, 'занятие', 'занятия', 'занятий'), 'занятие');
  assert.equal(plural(3, 'занятие', 'занятия', 'занятий'), 'занятия');
  assert.equal(plural(11, 'занятие', 'занятия', 'занятий'), 'занятий');
  assert.equal(plural(21, 'занятие', 'занятия', 'занятий'), 'занятие');
});

check('полное имя', () => {
  assert.equal(getFullName('Владимир', 'Иванов'), 'Владимир Иванов');
  assert.equal(getFullName('Владимир', null), 'Владимир');
});

check('деньги без копеек', () => {
  assert.ok(formatMoney(4500).includes('4'));
});

/* -------------------------- Телефон ------------------------- */

check('телефон приводится к +7', () => {
  assert.equal(normalizePhone('8 (921) 275-25-86'), '89212752586');
  assert.equal(formatPhoneForDatabase('8 (921) 275-25-86'), '+79212752586');
  assert.equal(formatPhoneForDatabase('+7 921 275 25 86'), '+79212752586');
  assert.equal(formatPhoneForDatabase('9212752586'), '+79212752586');
});

check('валидация телефона', () => {
  assert.equal(isValidPhone('+79212752586'), true);
  assert.equal(isValidPhone('+7921275258'), false);
  assert.ok(formatPhoneForDisplay('+79212752586').includes('921'));
});

/* -------------------------- Статусы ------------------------- */

check('статусы записей', () => {
  assert.equal(isActiveBooking('booked'), true);
  assert.equal(isActiveBooking('confirmed'), true);
  assert.equal(isActiveBooking('cancelled'), false);
  assert.equal(isCancelledStatus('cancelled'), true);
});

check('активность подписки', () => {
  const future = formatDateKey(addDays(new Date(), 10));
  const past = formatDateKey(addDays(new Date(), -10));

  assert.equal(
    isSubscriptionActive({ isActive: true, endDate: future, lessonsLeft: 3 }),
    true,
  );
  assert.equal(
    isSubscriptionActive({ isActive: true, endDate: past, lessonsLeft: 3 }),
    false,
  );
  assert.equal(
    isSubscriptionActive({ isActive: false, endDate: future, lessonsLeft: 3 }),
    false,
  );
});

/* ------------------------ Цена подписки --------------------- */

check('скидка растёт до 15% к максимуму занятий', () => {
  assert.equal(getDiscountPercent(8, 8, 16), 0);
  assert.equal(getDiscountPercent(16, 8, 16), 15);
  assert.ok(getDiscountPercent(12, 8, 16) > 0);
});

check('итоговая цена округляется до 5 рублей', () => {
  const plan = {
    basePricePerLesson: 700,
    minLessons: 8,
    maxLessons: 16,
  };

  const total = getTotalPrice(plan, 12);

  assert.equal(total % 5, 0);
  assert.ok(total > 0);
  assert.ok(getCalculatedPrice(700, 16, 8, 16) < 700);
});



/* ---------------- Фильтры направлений ---------------- */


const makeDirection = (over = {}) => ({
  id: 'd1',
  name: 'Гитара 7+',
  subscriptionTypeId: 'p1',
  subscriptionType: { id: 'p1', name: 'Стандарт' },
  schedules: [{ id: 's1', kind: 'group', dayOfWeek: 1 }],
  ...over,
});

check('возраст берётся из названия направления', () => {
  assert.equal(getDirectionMinAge(makeDirection()), 7);
  assert.equal(getDirectionMinAge(makeDirection({ name: 'Театр' })), null);
});

check('фильтр возраста: «до 6 лет» прячет направления с 7+', () => {
  const list = [
    makeDirection({ id: 'a', name: 'Рисование 3+' }),
    makeDirection({ id: 'b', name: 'Гитара 7+' }),
    makeDirection({ id: 'c', name: 'Театр' }),
  ];

  const result = filterDirections(list, { ...EMPTY_FILTERS, age: 'preschool' });

  assert.deepEqual(result.map((item) => item.id), ['a', 'c']);
});

check('фильтр тарифа и дня недели', () => {
  const list = [
    makeDirection({ id: 'a', subscriptionTypeId: 'p1' }),
    makeDirection({ id: 'b', subscriptionTypeId: 'p2' }),
    makeDirection({
      id: 'c',
      subscriptionTypeId: 'p1',
      schedules: [{ id: 's2', kind: 'individual', dayOfWeek: 3 }],
    }),
  ];

  assert.deepEqual(
    filterDirections(list, { ...EMPTY_FILTERS, plan: 'p1' }).map((i) => i.id),
    ['a', 'c'],
  );

  assert.deepEqual(
    filterDirections(list, { ...EMPTY_FILTERS, day: 3 }).map((i) => i.id),
    ['c'],
  );

  assert.deepEqual(
    filterDirections(list, { ...EMPTY_FILTERS, format: 'individual' }).map((i) => i.id),
    ['c'],
  );
});

check('направление без расписания не исчезает без фильтра дня', () => {
  const list = [makeDirection({ id: 'a', schedules: [] })];

  assert.equal(filterDirections(list, EMPTY_FILTERS).length, 1);
  assert.equal(filterDirections(list, { ...EMPTY_FILTERS, day: 1 }).length, 0);
});

check('в фильтре тарифов нет пустых и повторяющихся вариантов', () => {
  const plans = buildPlanFilters([
    makeDirection({ id: 'a' }),
    makeDirection({ id: 'b' }),
    makeDirection({ id: 'c', subscriptionType: null, subscriptionTypeId: null }),
  ]);

  assert.deepEqual(plans.map((p) => p.value), ['all', 'p1']);
});

check('счётчик активных фильтров', () => {
  assert.equal(countActiveFilters(EMPTY_FILTERS), 0);
  assert.equal(countActiveFilters({ ...EMPTY_FILTERS, age: 'junior', day: 2 }), 2);
});

/* ---------------- Запись на занятие ---------------- */

check('свежая запись подмешивается без дублей', () => {
  const current = [{ id: 'b1' }];

  assert.equal(mergeBookings(current, []).length, 1);
  assert.equal(mergeBookings(current, [{ id: 'b1' }]).length, 1);
  assert.equal(mergeBookings(current, [{ id: 'b2' }]).length, 2);
  assert.equal(mergeBookings(undefined, [{ id: 'b2' }]).length, 1);
});

check('прошедшее сегодня занятие переносится на следующую неделю', () => {
  const now = new Date();
  const todayIso = getIsoDay(now);

  /* Время, которое точно уже прошло */
  const past = getNextDateForDay(todayIso, '00:00:00');

  assert.equal(formatDateKey(past), formatDateKey(addDays(getStartOfDay(now), 7)));

  /* Время, которое точно ещё не наступило */
  const future = getNextDateForDay(todayIso, '23:59:00');

  assert.equal(formatDateKey(future), formatDateKey(getStartOfDay(now)));
});

check('заголовок выбранного дня', () => {
  const today = new Date();

  assert.ok(formatSelectedDayLabel(formatDateKey(today)).startsWith('Сегодня, '));

  assert.ok(
    formatSelectedDayLabel(formatDateKey(addDays(today, 1))).startsWith('Завтра, '),
  );

  /* Дата далеко впереди: точно не сегодня и не завтра */
  const far = addDays(today, 10);

  const label = formatSelectedDayLabel(formatDateKey(far));

  assert.ok(label.includes(String(far.getDate())));
  assert.ok(!label.startsWith('Сегодня'));
  assert.ok(!label.startsWith('Завтра'));
});


/* ------------------- Разовая запись ------------------- */

check('цена занятия попадает в событие из тарифа направления', () => {
  const events = buildFor(['2026-01-19'], {
    schedule: {
      activity: {
        ...activity,
        subscriptionType: { name: 'Базовая', basePricePerLesson: 750 },
      },
    },
  });

  assert.equal(events[0].pricePerLesson, 750);
});

check('тариф без цены — цена события 0, кнопка покажет дату вместо суммы', () => {
  const events = buildFor(['2026-01-19']);

  assert.equal(events[0].pricePerLesson, 0);
});

check('разовые записи отличаются от записей по подписке', () => {
  const events = buildFor(['2026-01-19'], {
    children: [
      { id: 'c1', firstName: 'Аня' },
      { id: 'c2', firstName: 'Петя' },
    ],
    bookings: [
      /* обычная запись — есть subscriptionId */
      {
        id: 'b1',
        scheduleId: 'g1',
        lessonDate: '2026-01-19',
        status: 'booked',
        childId: 'c1',
        subscriptionId: 's1',
      },
      /* разовая запись — subscriptionId пустой */
      {
        id: 'b2',
        scheduleId: 'g1',
        lessonDate: '2026-01-19',
        status: 'booked',
        childId: 'c2',
        subscriptionId: null,
      },
    ],
  });

  assert.deepEqual(events[0].oneOffChildIds, ['c2']);
  assert.deepEqual(events[0].bookedChildIds, ['c1', 'c2']);
  /* Оба ребёнка занимают места одинаково */
  assert.equal(events[0].spotsLeft, 3);
});


/* ------------------- Уведомления о записи ------------------- */

check('перечисление имён детей', () => {
  assert.equal(joinNames(['Миша']), 'Миша');
  assert.equal(joinNames(['Миша', 'Аня']), 'Миша и Аня');
  assert.equal(joinNames(['Миша', 'Аня', 'Петя']), 'Миша, Аня и Петя');
  assert.equal(joinNames([]), 'Ребёнок');
});

check('уведомление о записи на сегодня — как на сайте', () => {
  const today = formatDateKey(new Date());

  const { title, message } = buildBookingNotification({
    childNames: ['Миша'],
    lessonName: 'Рисование',
    lessonDate: today,
    time: '18:00:00',
  });

  assert.equal(title, 'Запись на занятие');
  assert.equal(
    message,
    'Миша записан на занятие «Рисование» сегодня в 18:00.',
  );
});

check('уведомление на другую дату и на нескольких детей', () => {
  const later = addDays(new Date(), 10);

  const { message } = buildBookingNotification({
    childNames: ['Миша', 'Аня'],
    lessonName: 'Гитара',
    lessonDate: formatDateKey(later),
    time: '16:30:00',
  });

  assert.ok(message.startsWith('Миша и Аня записаны на занятие «Гитара» '));
  assert.ok(message.includes(String(later.getDate())));
  assert.ok(message.endsWith('в 16:30.'));
});

check('разовая запись помечается в уведомлении', () => {
  const { title, message } = buildBookingNotification({
    childNames: ['Миша'],
    lessonName: 'Рисование',
    lessonDate: formatDateKey(addDays(new Date(), 1)),
    time: '18:00',
    once: true,
  });

  assert.equal(title, 'Разовая запись на занятие');
  assert.ok(message.includes('завтра'));
  assert.ok(message.includes('без подписки'));
});

check('уведомление об отмене записи', () => {
  const { title, message } = buildCancelNotification({
    childName: 'Миша',
    lessonName: 'Рисование',
    lessonDate: formatDateKey(new Date()),
  });

  assert.equal(title, 'Запись отменена');
  assert.equal(
    message,
    'Миша: запись на занятие «Рисование» сегодня отменена.',
  );
});

console.log(`\n✓ Всего проверок: ${passed}`);
