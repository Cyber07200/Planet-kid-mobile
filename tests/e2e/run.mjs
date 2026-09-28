/**
 * Сквозная проверка записи: от вызова сервиса до строк в «базе».
 *
 * Клиент Supabase подменён на память (fake-supabase.mjs),
 * сами сервисы — реальные файлы проекта.
 *
 * Запуск: node --import ./tests/setup.mjs tests/e2e/run.mjs
 */
import assert from 'node:assert/strict';

import { fake } from './supabase.mjs';
import { BookingsService } from '../../src/services/bookings.service.js';
import { NotificationsService } from '../../src/services/notifications.service.js';
import { mergeBookings } from '../../src/utils/status.js';

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

const USER = 'user-1';
const CHILD_A = 'child-a';
const CHILD_B = 'child-b';
const SCHEDULE = 'sched-1';
const DATE = '2026-09-21';

/* Расписание в «базе» */
fake.table('group_schedules').push({
  id: SCHEDULE,
  status: 'scheduled',
  start_time: '16:00:00',
  end_time: '16:45:00',
  day_of_week: 1,
  activity_type_id: 'act-1',
});

fake.table('individual_schedules').push({
  id: 'ind-1',
  status: 'scheduled',
  is_booked: false,
  start_time: '17:00:00',
  end_time: '17:45:00',
  day_of_week: 2,
  individual_activity_id: 'ia-1',
});

await check('запись по подписке пишется со ссылкой на подписку', async () => {
  const created = await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: [CHILD_A],
    userId: USER,
    subscriptionId: 'sub-1',
    lessonDate: DATE,
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].childId, CHILD_A);
  assert.equal(created[0].subscriptionId, 'sub-1');
  assert.equal(created[0].status, 'booked');

  const row = fake.table('group_bookings').at(-1);

  /* Именно ребёнок, а не только пользователь */
  assert.equal(row.child_id, CHILD_A);
  assert.equal(row.user_id, USER);
  assert.equal(row.lesson_date, DATE);
  assert.equal(row.subscription_id, 'sub-1');
});

await check('разовая запись отличается пустым subscription_id', async () => {
  const created = await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: [CHILD_B],
    userId: USER,
    subscriptionId: null,
    lessonDate: DATE,
  });

  assert.equal(created[0].childId, CHILD_B);
  assert.equal(created[0].subscriptionId, null);

  const row = fake
    .table('group_bookings')
    .find((item) => item.child_id === CHILD_B);

  assert.equal(row.subscription_id, null);
  assert.equal(row.status, 'booked');
});

await check('статус слота проверяется перед записью', async () => {
  const status = await BookingsService.getScheduleStatus({
    scheduleId: SCHEDULE,
    kind: 'group',
  });

  assert.equal(status, 'scheduled');

  const missing = await BookingsService.getScheduleStatus({
    scheduleId: 'нет-такого',
    kind: 'group',
  });

  assert.equal(missing, null);
});

await check('повторная запись ловится проверкой дублей', async () => {
  const booked = await BookingsService.findBookedChildIds({
    scheduleId: SCHEDULE,
    kind: 'group',
    childIds: [CHILD_A, CHILD_B, 'child-c'],
    lessonDate: DATE,
    userId: USER,
  });

  assert.deepEqual(booked.sort(), [CHILD_A, CHILD_B].sort());
});

await check('занятые места считаются по базе', async () => {
  const count = await BookingsService.countActiveBookings('group', SCHEDULE, DATE);

  assert.equal(count, 2);
});

await check('записи пользователя читаются обратно после перезагрузки', async () => {
  const bookings = await BookingsService.getBookingsForChildren(USER, [
    CHILD_A,
    CHILD_B,
  ]);

  assert.equal(bookings.length, 2);

  /* Разовую запись видно по пустому subscriptionId */
  const once = bookings.find((item) => item.childId === CHILD_B);

  assert.equal(once.subscriptionId, null);
  assert.equal(once.lessonDate, DATE);
});

await check('отмена меняет статус, а не удаляет строку', async () => {
  const target = fake
    .table('group_bookings')
    .find((item) => item.child_id === CHILD_A);

  const subscriptionId = await BookingsService.cancelBooking({
    bookingId: target.id,
    kind: 'group',
    userId: USER,
    scheduleId: SCHEDULE,
  });

  /* Вернулась подписка — значит занятие можно вернуть на баланс */
  assert.equal(subscriptionId, 'sub-1');

  const after = fake
    .table('group_bookings')
    .find((item) => item.id === target.id);

  assert.ok(after, 'строка должна остаться в истории');
  assert.equal(after.status, 'cancelled');

  /* Место освободилось */
  const count = await BookingsService.countActiveBookings('group', SCHEDULE, DATE);

  assert.equal(count, 1);
});

await check('отмена разовой записи не возвращает занятие на подписку', async () => {
  const target = fake
    .table('group_bookings')
    .find((item) => item.child_id === CHILD_B);

  const subscriptionId = await BookingsService.cancelBooking({
    bookingId: target.id,
    kind: 'group',
    userId: USER,
    scheduleId: SCHEDULE,
  });

  assert.equal(subscriptionId, null);
});

await check('после отмены ребёнка можно записать снова', async () => {
  const booked = await BookingsService.findBookedChildIds({
    scheduleId: SCHEDULE,
    kind: 'group',
    childIds: [CHILD_A],
    lessonDate: DATE,
    userId: USER,
  });

  assert.deepEqual(booked, []);
});

await check('индивидуальная запись помечает слот занятым', async () => {
  const [created] = await BookingsService.createBookings({
    kind: 'individual',
    scheduleId: 'ind-1',
    childIds: [CHILD_A],
    userId: USER,
    subscriptionId: null,
    lessonDate: DATE,
  });

  assert.equal(created.childId, CHILD_A);
  assert.equal(created.subscriptionId, null);

  const slot = fake.table('individual_schedules').find((i) => i.id === 'ind-1');

  assert.equal(slot.is_booked, true);

  /* Отмена освобождает слот обратно */
  await BookingsService.cancelBooking({
    bookingId: created.id,
    kind: 'individual',
    userId: USER,
    scheduleId: 'ind-1',
  });

  const freed = fake.table('individual_schedules').find((i) => i.id === 'ind-1');

  assert.equal(freed.is_booked, false);
});

await check('уведомление создаётся в двух таблицах, как в админке', async () => {
  const id = await NotificationsService.createForUser({
    userId: USER,
    title: 'Запись на занятие',
    message: 'Миша записан на занятие «Рисование» сегодня в 18:00.',
  });

  const notification = fake.table('notifications').find((i) => i.id === id);

  assert.ok(notification);
  assert.equal(notification.target_role, 'parent');

  /*
   * Тип не выдумываем: в базе это enum, и приложение либо берёт
   * значение из существующих уведомлений, либо не пишет поле вовсе,
   * чтобы сработало значение по умолчанию.
   */
  assert.equal(notification.type, undefined);

  const link = fake
    .table('user_notifications')
    .find((i) => i.notification_id === id);

  assert.ok(link, 'уведомление должно быть привязано к пользователю');
  assert.equal(link.user_id, USER);
  assert.equal(link.is_read, false);
});

await check('уведомления читаются обратно вместе с текстом', async () => {
  /* Связь и справочник читаются одним запросом, как в приложении */
  const rows = fake.table('user_notifications');

  assert.ok(rows.length > 0);

  const notifications = await NotificationsService.getForUser(USER);

  assert.equal(notifications.length, rows.length);
  assert.ok(notifications.every((item) => item.message && !item.isRead));
});

await check('тип уведомления берётся из существующих записей', async () => {
  /* Админка сайта уже создавала уведомления — берём тип оттуда */
  fake.table('notifications').push({
    id: 'seed-1',
    title: 'Из админки',
    message: 'Пример',
    type: 'general',
    target_role: 'all',
  });

  /* Сбрасываем кэш, чтобы сервис перечитал тип */
  NotificationsService._knownType = undefined;

  const id = await NotificationsService.createForUser({
    userId: USER,
    title: 'Запись на занятие',
    message: 'Проверка типа',
  });

  const created = fake.table('notifications').find((i) => i.id === id);

  assert.equal(created.type, 'general');
});

await check('откат записи находит строку по слоту, даже без настоящего id', async () => {
  const created = await BookingsService.createBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    childIds: ['child-rollback'],
    userId: USER,
    subscriptionId: 'sub-1',
    lessonDate: DATE,
  });

  assert.equal(created.length, 1);

  await BookingsService.rollbackBookings({
    kind: 'group',
    scheduleId: SCHEDULE,
    lessonDate: DATE,
    childIds: ['child-rollback'],
    userId: USER,
  });

  const row = fake.table('group_bookings').find((i) => i.child_id === 'child-rollback');

  assert.equal(row.status, 'cancelled');
});

await check('локальная копия записи, когда чтение закрыто политикой', async () => {
  fake.fail((table, op) => (table === 'group_bookings' && op === 'select' ? { message: '' } : null));

  try {
    const created = await BookingsService.createBookings({
      kind: 'group',
      scheduleId: SCHEDULE,
      childIds: ['child-rls'],
      userId: USER,
      subscriptionId: null,
      lessonDate: DATE,
    });

    assert.equal(created.length, 1);
    assert.ok(created[0].id.startsWith('local_'));
    assert.equal(mergeBookings([], created).length, 1);
  } finally {
    fake.fail(null);
  }
});

await check('отметка о прочтении касается только своего уведомления', async () => {
  const link = fake.table('user_notifications')[0];

  await NotificationsService.markAsRead(link.id, 'чужой-пользователь');
  assert.equal(link.is_read, false);

  await NotificationsService.markAsRead(link.id, USER);
  assert.equal(link.is_read, true);
});

console.log(`\n✓ Сквозных проверок: ${passed}`);
