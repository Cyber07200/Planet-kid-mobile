/**
 * Проверки правил записи, ввода и текстов ошибок — на настоящих файлах src.
 *
 * Запуск: node --import ./tests/setup.mjs tests/rules.mjs
 */
import assert from 'node:assert/strict';

import { addDays, formatDateKey, getNextDateForDay } from '../src/utils/date.js';
import { getUpcomingBookings } from '../src/utils/status.js';
import {
  cleanGender,
  cleanName,
  escapeLikePattern,
  isSafeId,
  isValidBirthDate,
  isValidName,
} from '../src/utils/validation.js';
import { describeSupabaseError } from '../src/utils/errors.js';
import {
  describeCancellation,
  getBlockReason,
  getOnceBlockReason,
  getSubscriptionProblem,
  validateSelection,
} from '../src/utils/bookingRules.js';
import {
  buildDirectionSlot,
  getSpotsLeft,
  summarizeSlotBookings,
} from '../src/services/calendar.js';

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

/* ------------------- Проверка ввода ------------------- */

check('имя очищается и ограничивается по длине', () => {
  assert.equal(cleanName('  Иван   Петров '), 'Иван Петров');
  assert.equal(cleanName('а'.repeat(80)).length, 50);
  assert.equal(isValidName('Анна-Мария'), true);
  assert.equal(isValidName('   '), false);
  assert.equal(isValidName('<script>'), false);
});

check('дата рождения не в будущем и корректная', () => {
  assert.equal(isValidBirthDate('2018-05-10'), true);
  assert.equal(isValidBirthDate(formatDateKey(addDays(new Date(), 1))), false);
  assert.equal(isValidBirthDate('не дата'), false);
  assert.equal(isValidBirthDate('1800-01-01'), false);
});

check('пол — только известные значения', () => {
  assert.equal(cleanGender('female'), 'female');
  assert.equal(cleanGender('other'), null);
});

check('шаблон ILIKE экранируется', () => {
  assert.equal(escapeLikePattern('% %'), '\\% \\%');
  assert.equal(escapeLikePattern('Иван_1'), 'Иван\\_1');
});

check('id из хранилища без спецсимволов фильтров', () => {
  assert.equal(isSafeId('3f1c2a4e-1111-4222-8333-444455556666'), true);
  assert.equal(isSafeId('1,2),or=(id.gt.0'), false);
  assert.equal(isSafeId(''), false);
});

/* ------------------- Тексты ошибок ------------------- */

check('технические ошибки базы не показываются пользователю', () => {
  const fallback = 'Не удалось';

  assert.equal(
    describeSupabaseError({ code: '42703', message: 'column users.foo does not exist' }, fallback),
    fallback,
  );
  assert.equal(describeSupabaseError({ message: '' }, fallback), fallback);
  assert.equal(
    describeSupabaseError({ code: '23505', message: 'duplicate key' }, fallback),
    'Такая запись уже существует.',
  );
  assert.match(
    describeSupabaseError(new TypeError('Network request failed'), fallback),
    /Нет соединения/,
  );
  /* Наши собственные понятные сообщения проходят как есть */
  assert.equal(describeSupabaseError(new Error('Введите имя'), fallback), 'Введите имя');
});

/* ------------------- Правила записи ------------------- */

const lessonDateKey = formatDateKey(addDays(new Date(), 3));

const makeEvent = (over = {}) => ({
  type: 'group',
  name: 'Рисование',
  lessonDate: lessonDateKey,
  cancelled: false,
  spotsLeft: 3,
  maxPlaces: 5,
  bookedChildIds: [],
  bookedChildren: [],
  oneOffChildIds: [],
  ...over,
});

const activeSubscription = {
  id: 'sub',
  lessonsLeft: 4,
  endDate: formatDateKey(addDays(new Date(), 30)),
};

check('причины, по которым запись по подписке недоступна', () => {
  assert.equal(getBlockReason(makeEvent(), activeSubscription), null);
  assert.match(getBlockReason(makeEvent(), null), /подписку/);
  assert.match(getBlockReason(makeEvent({ cancelled: true }), activeSubscription), /отменено/);
  assert.match(getBlockReason(makeEvent(), { ...activeSubscription, lessonsLeft: 0 }), /закончились/);
  assert.match(
    getBlockReason(makeEvent(), { ...activeSubscription, endDate: formatDateKey(new Date()) }),
    /раньше/,
  );
  assert.match(getOnceBlockReason(makeEvent({ spotsLeft: 0 })), /нет свободных мест/);
});

check('проверка выбора детей перед записью', () => {
  assert.equal(validateSelection({ event: makeEvent(), childIds: ['c1'] }), null);
  assert.match(validateSelection({ event: makeEvent(), childIds: [] }), /хотя бы одного/);
  assert.match(
    validateSelection({ event: makeEvent({ type: 'individual' }), childIds: ['c1', 'c2'] }),
    /только одного/,
  );
  assert.match(
    validateSelection({ event: makeEvent({ bookedChildIds: ['c1'] }), childIds: ['c1'] }),
    /уже записан/,
  );
  assert.match(
    validateSelection({ event: makeEvent({ lessonDate: '2000-01-01' }), childIds: ['c1'] }),
    /ближайшего месяца/,
  );
});

check('свежая подписка из базы проверяется перед записью', () => {
  assert.equal(getSubscriptionProblem(activeSubscription, 2, lessonDateKey), null);
  assert.match(getSubscriptionProblem(null, 1, lessonDateKey), /не найдена/);
  assert.match(getSubscriptionProblem(activeSubscription, 5, lessonDateKey), /осталось только 4/);
});

check('текст отмены отличает разовую запись', () => {
  const event = makeEvent({ oneOffChildIds: ['c2'] });

  assert.match(describeCancellation({ event, childId: 'c1', childName: 'Аня' }), /вернётся/);
  assert.match(describeCancellation({ event, childId: 'c2', childName: 'Петя' }), /разовое/);
});

/* ------------------- Места в слоте ------------------- */

check('свободные места слота', () => {
  assert.equal(getSpotsLeft({ kind: 'group', maxPlaces: 5, taken: 2 }), 3);
  assert.equal(getSpotsLeft({ kind: 'group', maxPlaces: 5, taken: 9 }), 0);
  assert.equal(getSpotsLeft({ kind: 'individual', taken: 0 }), 1);
  assert.equal(getSpotsLeft({ kind: 'individual', taken: 0, isBooked: true }), 0);
  assert.equal(getSpotsLeft({ kind: 'group', maxPlaces: 5, taken: 0, cancelled: true }), 0);
});

check('сводка записей слота', () => {
  const summary = summarizeSlotBookings(
    [
      { id: 'b1', childId: 'c1', subscriptionId: 's1' },
      { id: 'b2', childId: 'c2', subscriptionId: null },
    ],
    [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
  );

  assert.deepEqual(summary.bookedChildIds, ['c1', 'c2']);
  assert.equal(summary.bookedChildren.length, 2);
  assert.deepEqual(summary.bookingIdsByChild, { c1: 'b1', c2: 'b2' });
  assert.deepEqual(summary.oneOffChildIds, ['c2']);
});

check('слот направления — ближайшая дата и записанные дети', () => {
  const schedule = { id: 's1', kind: 'group', dayOfWeek: 1, startTime: '16:00:00' };
  const date = formatDateKey(getNextDateForDay(1, '16:00:00'));

  const slot = buildDirectionSlot({
    direction: { maxPlaces: 4 },
    schedule,
    bookings: [
      { id: 'b1', scheduleId: 's1', lessonDate: date, status: 'booked', childId: 'c1' },
      { id: 'b2', scheduleId: 's1', lessonDate: date, status: 'cancelled', childId: 'c2' },
    ],
    children: [{ id: 'c1' }, { id: 'c2' }],
  });

  assert.equal(slot.lessonDate, date);
  assert.equal(slot.spotsLeft, 3);
  assert.deepEqual(slot.bookedChildIds, ['c1']);
});

check('ближайшие записи: без прошедших и отменённых, по дате', () => {
  const tomorrow = formatDateKey(addDays(new Date(), 1));
  const later = formatDateKey(addDays(new Date(), 5));
  const past = formatDateKey(addDays(new Date(), -2));

  const result = getUpcomingBookings([
    { id: 'late', lessonDate: later, status: 'booked' },
    { id: 'past', lessonDate: past, status: 'booked' },
    { id: 'cancel', lessonDate: tomorrow, status: 'cancelled' },
    { id: 'soon', lessonDate: tomorrow, status: 'booked' },
  ]);

  assert.deepEqual(result.map((item) => item.id), ['soon', 'late']);
});

console.log(`\n✓ Проверок правил и ввода: ${passed}`);
