/**
 * Проверка записи, когда чтение таблицы записей закрыто политиками.
 *
 * Это тот самый случай из логов: база отвечает пустой ошибкой
 * {"message": ""} на вспомогательные запросы. Вставка при этом
 * разрешена — значит запись обязана пройти, как на сайте.
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

const PARENT = 'parent-1';
const CHILD = 'child-1';
const SCHEDULE = 'sched-1';

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
  lessons_total: 8,
  lessons_left: 8,
  end_date: '2030-01-01',
  is_active: true,
});

/*
 * Политика: читать group_bookings нельзя (пустая ошибка),
 * вставлять — можно.
 */
fake.fail((table, op) =>
  table === 'group_bookings' && op === 'select' ? { message: '' } : null,
);

const direction = {
  id: 'act-1',
  name: 'Рисование 6+',
  description: 'Занятие',
  durationMinutes: 45,
  maxPlaces: 8,
  schedules: [
    {
      id: SCHEDULE,
      kind: 'group',
      dayOfWeek: 1,
      startTime: '16:00:00',
      endTime: '16:45:00',
      maxPlaces: 8,
      pricePerLesson: 700,
      teacher: { id: 'teacher-1', firstName: 'Евгений' },
    },
  ],
};

let data = {
  directions: [direction],
  children: [{ id: CHILD, firstName: 'Максим' }],
  bookings: [],
  subscription: {
    id: 'sub-1',
    lessonsLeft: 8,
    endDate: '2030-01-01',
    isActive: true,
  },
};

const box = { current: null };

const Probe = () => {
  box.current = useDirectionBooking({
    userId: PARENT,
    data,
    setData: (updater) => {
      data = typeof updater === 'function' ? updater(data) : updater;
    },
    refresh: async () => {},
  });

  return null;
};

let renderer;

act(() => {
  renderer = TestRenderer.create(React.createElement(Probe));
});

const rerender = () => {
  act(() => {
    renderer.update(React.createElement(Probe));
  });
};

await check('запись проходит, даже когда чтение записей закрыто', async () => {
  await act(async () => {
    box.current.openDirection(direction);
  });

  rerender();

  await act(async () => {
    await box.current.sheetProps.onBook();
  });

  rerender();

  /* Главное: строка в базе есть */
  const rows = fake.table('group_bookings');

  assert.equal(rows.length, 1, 'запись должна быть создана');
  assert.equal(rows[0].child_id, CHILD);
  assert.equal(rows[0].lesson_date, LESSON_DATE);

  /* И пользователю показан успех, а не «Не удалось записаться» */
  assert.equal(box.current.booking.error, null);
  assert.equal(box.current.booking.success.title, 'Ребёнок успешно записан!');
});

await check('занятие всё равно списалось с подписки', async () => {
  const subscription = fake
    .table('user_subscriptions')
    .find((item) => item.id === 'sub-1');

  assert.equal(subscription.lessons_left, 7);
});

console.log(`\n✓ Проверок при закрытом чтении: ${passed}`);
