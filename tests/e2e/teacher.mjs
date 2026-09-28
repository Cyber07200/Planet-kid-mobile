/**
 * Сквозная проверка связки «родитель → запись → преподаватель».
 *
 * Родитель записывает ребёнка через BookingsService, а преподаватель
 * читает своё расписание через TeacherService — обе стороны работают
 * с одними и теми же таблицами в «базе» (клиент Supabase подменён).
 */
import assert from 'node:assert/strict';

import { fake } from './supabase.mjs';
import { BookingsService } from '../../src/services/bookings.service.js';
import { TeacherService } from '../../src/services/teacher.service.js';

let passed = 0;

const check = async (label, fn) => {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${label}\n  ${error.message}`);
    process.exitCode = 1;
  }
};

const TEACHER = 'teacher-1';
const PARENT = 'parent-1';
const CHILD = 'child-maksim';
const OTHER_CHILD = 'child-anna';
const SCHEDULE = 'sched-school';
const DATE = '2026-09-20';
const OTHER_DATE = '2026-09-27';

/* Направление, слот преподавателя, дети и родитель — как в базе сайта */
fake.table('activity_types').push({
  id: 'act-school',
  name: 'Подготовка к школе',
  max_places: 10,
  duration_minutes: 45,
  image: null,
});

fake.table('group_schedules').push({
  id: SCHEDULE,
  teacher_id: TEACHER,
  status: 'scheduled',
  start_time: '15:00:00',
  end_time: '15:45:00',
  day_of_week: 7,
  activity_type_id: 'act-school',
  activity_types: {
    id: 'act-school',
    name: 'Подготовка к школе',
    max_places: 10,
    duration_minutes: 45,
    image: null,
  },
});

fake.table('children').push(
  {
    id: CHILD,
    parent_id: PARENT,
    first_name: 'Максим',
    last_name: 'Иванов',
    birth_date: '2019-05-10',
  },
  {
    id: OTHER_CHILD,
    parent_id: PARENT,
    first_name: 'Анна',
    last_name: 'Иванова',
    birth_date: '2018-02-01',
  },
);

fake.table('users').push({
  id: PARENT,
  first_name: 'Ольга',
  last_name: 'Иванова',
  phone: '+70000000000',
  role: 'parent',
});

await check('родитель записывает ребёнка — строка уходит в общую таблицу', async () => {
  const created = await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: [CHILD],
    userId: PARENT,
    subscriptionId: 'sub-1',
    lessonDate: DATE,
  });

  assert.equal(created.length, 1);

  const row = fake.table('group_bookings').at(-1);

  assert.equal(row.schedule_id, SCHEDULE);
  assert.equal(row.child_id, CHILD);
  assert.equal(row.user_id, PARENT);
  assert.equal(row.lesson_date, DATE);
});

await check('преподаватель видит занятие в своём расписании', async () => {
  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  assert.ok(lesson, 'слот преподавателя должен найтись');
  assert.equal(lesson.name, 'Подготовка к школе');
  assert.equal(lesson.startTime, '15:00:00');
  assert.equal(lesson.maxPlaces, 10);
});

await check('количество детей считается на конкретную дату', async () => {
  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  /* 20 сентября — один ребёнок, на другую дату записей нет */
  assert.equal(lesson.bookingsByDate[DATE], 1);
  assert.equal(lesson.bookingsByDate[OTHER_DATE], undefined);
  assert.equal(lesson.participants, 1);
});

await check('преподаватель открывает занятие и видит именно этого ребёнка', async () => {
  const participants = await TeacherService.getScheduleParticipants(
    SCHEDULE,
    'group',
    DATE,
  );

  assert.equal(participants.length, 1);
  assert.equal(participants[0].firstName, 'Максим');
  assert.equal(participants[0].childId, CHILD);
  /* Виден и родитель, который записал */
  assert.equal(participants[0].parentName, 'Ольга Иванова');
  assert.equal(participants[0].isOneOff, false);
});

await check('вторая запись увеличивает счётчик того же дня', async () => {
  await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: [OTHER_CHILD],
    userId: PARENT,
    /* Разовая запись — без подписки */
    subscriptionId: null,
    lessonDate: DATE,
  });

  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  assert.equal(lesson.bookingsByDate[DATE], 2);

  const participants = await TeacherService.getScheduleParticipants(
    SCHEDULE,
    'group',
    DATE,
  );

  assert.deepEqual(
    participants.map((item) => item.firstName).sort(),
    ['Анна', 'Максим'],
  );

  /* Разовая запись помечена и в списке преподавателя */
  const once = participants.find((item) => item.childId === OTHER_CHILD);

  assert.equal(once.isOneOff, true);
});

await check('запись на другую дату не попадает в выбранный день', async () => {
  await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: [CHILD],
    userId: PARENT,
    subscriptionId: 'sub-1',
    lessonDate: OTHER_DATE,
  });

  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  assert.equal(lesson.bookingsByDate[DATE], 2);
  assert.equal(lesson.bookingsByDate[OTHER_DATE], 1);

  const participants = await TeacherService.getScheduleParticipants(
    SCHEDULE,
    'group',
    OTHER_DATE,
  );

  assert.equal(participants.length, 1);
});

await check('после отмены родителем счётчик преподавателя уменьшается', async () => {
  const target = fake
    .table('group_bookings')
    .find((item) => item.child_id === OTHER_CHILD && item.lesson_date === DATE);

  await BookingsService.cancelBooking({
    bookingId: target.id,
    kind: 'group',
    userId: PARENT,
    scheduleId: SCHEDULE,
  });

  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  assert.equal(lesson.bookingsByDate[DATE], 1);

  const participants = await TeacherService.getScheduleParticipants(
    SCHEDULE,
    'group',
    DATE,
  );

  assert.deepEqual(
    participants.map((item) => item.firstName),
    ['Максим'],
  );
});

await check('свободные места считаются от реального числа записей', async () => {
  const booked = await BookingsService.countActiveBookings('group', SCHEDULE, DATE);

  const schedule = await TeacherService.getSchedule(TEACHER, {
    fromDate: '2026-09-01',
    toDate: '2026-10-31',
  });

  const lesson = schedule.find((item) => item.id === SCHEDULE);

  assert.equal(booked, 1);
  assert.equal(lesson.maxPlaces - booked, 9);
});

console.log(`\n✓ Проверок связки родитель → преподаватель: ${passed}`);
