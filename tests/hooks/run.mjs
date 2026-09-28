/**
 * Проверка настоящих хуков записи в связке с «базой».
 *
 * Здесь запускается тот же код, что и в приложении:
 * useDirectionBooking → useBooking → BookingsService → Supabase.
 * Клиент Supabase подменён на память, поэтому виден весь путь
 * от нажатия «Записаться» до строки в таблице.
 *
 * Запуск: node --import ./tests/setup.mjs tests/hooks/run.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';

import { fake } from '../e2e/supabase.mjs';
import { useDirectionBooking } from '../../src/hooks/useDirectionBooking.js';
import { formatDateKey, getNextDateForDay } from '../../src/utils/date.js';

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;

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

/* --------------------------- данные --------------------------- */

const PARENT = 'parent-1';
const CHILD = 'child-1';
const SCHEDULE = 'sched-1';

/* Занятие в понедельник: дату считаем так же, как приложение */
const LESSON_DATE = formatDateKey(getNextDateForDay(1, '16:00:00'));

fake.table('group_schedules').push({
  id: SCHEDULE,
  teacher_id: 'teacher-1',
  status: 'scheduled',
  start_time: '16:00:00',
  end_time: '16:45:00',
  day_of_week: 1,
  activity_type_id: 'act-1',
});

fake.table('user_subscriptions').push({
  id: 'sub-1',
  user_id: PARENT,
  subscription_type_id: 'type-1',
  lessons_total: 8,
  lessons_left: 8,
  price_per_lesson: 700,
  teacher_payout_per_lesson: 300,
  end_date: '2030-01-01',
  is_active: true,
});

const direction = {
  id: 'act-1',
  name: 'Рисование 6+',
  description: 'Занятие по рисованию',
  durationMinutes: 45,
  maxPlaces: 8,
  image: null,
  subscriptionTypeId: 'type-1',
  subscriptionType: {
    id: 'type-1',
    name: 'Базовая',
    basePricePerLesson: 700,
  },
  schedules: [
    {
      id: SCHEDULE,
      kind: 'group',
      dayOfWeek: 1,
      startTime: '16:00:00',
      endTime: '16:45:00',
      maxPlaces: 8,
      pricePerLesson: 700,
      teacher: { id: 'teacher-1', firstName: 'Евгений', lastName: 'В.' },
    },
  ],
};

const child = { id: CHILD, firstName: 'Максим', lastName: 'Иванов' };

/* --------------------------- харнесс --------------------------- */

/** Монтирует хук и даёт доступ к его текущему значению */
const mountHook = (getData, setData) => {
  const box = { current: null };

  const Probe = () => {
    box.current = useDirectionBooking({
      userId: PARENT,
      data: getData(),
      setData,
      refresh: async () => {},
    });

    return null;
  };

  let renderer;

  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });

  return {
    box,
    rerender: () => {
      act(() => {
        renderer.update(React.createElement(Probe));
      });
    },
  };
};

/* --------------------------- проверки --------------------------- */

let data = {
  directions: [direction],
  children: [child],
  bookings: [],
  subscription: {
    id: 'sub-1',
    userId: PARENT,
    lessonsLeft: 8,
    endDate: '2030-01-01',
    isActive: true,
  },
};

const setData = (updater) => {
  data = typeof updater === 'function' ? updater(data) : updater;
};

const { box, rerender } = mountHook(() => data, setData);

await check('карточка направления открывается и ребёнок выбран', async () => {
  await act(async () => {
    box.current.openDirection(direction);
  });

  rerender();

  const { selectedEvent, sheetProps } = box.current;

  assert.ok(selectedEvent, 'событие занятия должно собраться');
  assert.equal(selectedEvent.scheduleId, SCHEDULE);
  assert.equal(selectedEvent.lessonDate, LESSON_DATE);
  assert.equal(selectedEvent.spotsLeft, 8);

  /* Ребёнок один — отмечается сразу, как на сайте */
  assert.deepEqual(sheetProps.selectedChildIds, [CHILD]);

  /* Запись доступна: подписка активна, мест хватает */
  assert.equal(sheetProps.canBook, true);
  assert.equal(sheetProps.blockReason, null);
});

await check('нажатие «Записаться» создаёт строку в базе', async () => {
  await act(async () => {
    await box.current.sheetProps.onBook();
  });

  rerender();

  const rows = fake.table('group_bookings');

  assert.equal(rows.length, 1, 'запись должна появиться в group_bookings');
  assert.equal(rows[0].child_id, CHILD);
  assert.equal(rows[0].user_id, PARENT);
  assert.equal(rows[0].schedule_id, SCHEDULE);
  assert.equal(rows[0].lesson_date, LESSON_DATE);
  assert.equal(rows[0].subscription_id, 'sub-1');
  assert.equal(rows[0].status, 'booked');

  /* Ошибки быть не должно */
  assert.equal(box.current.booking.error, null);
  /* Текст успеха — как на сайте */
  assert.equal(box.current.booking.success.title, 'Ребёнок успешно записан!');
  assert.equal(
    box.current.booking.success.message,
    'Занятие добавлено в расписание. С абонемента списано одно занятие.',
  );
});

await check('занятие списалось с подписки', async () => {
  const subscription = fake
    .table('user_subscriptions')
    .find((item) => item.id === 'sub-1');

  assert.equal(subscription.lessons_left, 7);
});

await check('создано уведомление о записи', async () => {
  const notifications = fake.table('notifications');

  assert.equal(notifications.length, 1);
  assert.match(notifications[0].message, /Максим/);

  const link = fake.table('user_notifications');

  assert.equal(link.length, 1);
  assert.equal(link[0].user_id, PARENT);
});

await check('статус в интерфейсе стал «Вы записаны»', async () => {
  /* Экран подмешал созданную запись — как в приложении */
  assert.equal(data.bookings.length, 1);

  rerender();

  const { selectedEvent } = box.current;

  assert.equal(selectedEvent.bookedChildIds.length, 1);
  assert.equal(selectedEvent.bookedChildren[0].firstName, 'Максим');
  assert.equal(selectedEvent.spotsLeft, 7);
});

await check('повторная запись того же ребёнка не проходит', async () => {
  await act(async () => {
    box.current.openDirection(direction);
  });

  rerender();

  await act(async () => {
    await box.current.sheetProps.onBook();
  });

  rerender();

  /* Ни одной новой строки */
  assert.equal(fake.table('group_bookings').length, 1);
});

await check('отмена меняет статус записи в базе', async () => {
  rerender();

  await act(async () => {
    box.current.sheetProps.onCancelBooking(CHILD);
  });

  rerender();

  /* Окно подтверждения открылось, а не системный alert */
  assert.equal(box.current.cancelDialogProps.visible, true);
  assert.match(box.current.cancelDialogProps.description, /будет отменена/);

  await act(async () => {
    await box.current.cancelDialogProps.onConfirm();
  });

  const row = fake.table('group_bookings')[0];

  assert.equal(row.status, 'cancelled');

  /* Занятие вернулось на баланс подписки */
  const subscription = fake
    .table('user_subscriptions')
    .find((item) => item.id === 'sub-1');

  assert.equal(subscription.lessons_left, 8);
});

console.log(`\n✓ Проверок хуков записи: ${passed}`);
