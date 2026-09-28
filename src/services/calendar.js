import {
  addDays,
  addMonths,
  formatDateKey,
  formatTime,
  getIsoDay,
  getNextDateForDay,
  getStartOfDay,
} from '../utils/date';
import { getFullName } from '../utils/format';
import { isActiveBooking } from '../utils/status';

/**
 * Построение событий календаря.
 *
 * Перенос вычислений из CalendarPage.tsx (веб): расписания хранятся
 * как «день недели + время», поэтому конкретные занятия
 * разворачиваются на даты от сегодня до +1 месяца — столько
 * разрешено бронировать на сайте.
 */

export const BOOKING_HORIZON_MONTHS = 1;

export const getBookingRange = (from = new Date()) => {
  const today = getStartOfDay(from);
  const maxDate = addMonths(today, BOOKING_HORIZON_MONTHS);

  return {
    today,
    maxDate,
    todayKey: formatDateKey(today),
    maxDateKey: formatDateKey(maxDate),
  };
};

export const getDateRange = (today, maxDate) => {
  const dates = [];

  for (let current = new Date(today); current <= maxDate; current = addDays(current, 1)) {
    dates.push(current);
  }

  return dates;
};

export const getTeacherName = (teacher) =>
  getFullName(teacher?.firstName, teacher?.lastName) || 'Преподаватель';

/**
 * Кто из детей записан на слот: списки для окна занятия и отмены.
 *
 * oneOffChildIds — записанные разово (без subscription_id): при их
 * отмене не обещаем возврат занятия на подписку.
 */
export const summarizeSlotBookings = (bookings, children = []) => {
  const bookedChildIds = bookings.map((booking) => booking.childId);

  return {
    bookedChildIds,
    bookedChildren: children.filter((child) => bookedChildIds.includes(child.id)),
    bookingIdsByChild: Object.fromEntries(
      bookings.map((booking) => [booking.childId, booking.id]),
    ),
    oneOffChildIds: bookings
      .filter((booking) => !booking.subscriptionId)
      .map((booking) => booking.childId),
  };
};

/** Свободные места: индивидуальный слот — на одного ребёнка */
export const getSpotsLeft = ({ kind, maxPlaces, taken, isBooked = false, cancelled = false }) => {
  if (cancelled) {
    return 0;
  }

  if (kind === 'individual') {
    return isBooked || taken > 0 ? 0 : 1;
  }

  return Math.max((maxPlaces ?? 0) - taken, 0);
};

/**
 * Ближайшее занятие слота направления: дата (ближайший такой день
 * недели, уже начавшееся занятие пропускаем), места и записанные дети.
 * Так же дату считает DirectionsPage.tsx на сайте.
 */
export const buildDirectionSlot = ({ direction, schedule, bookings = [], children = [] }) => {
  const lessonDate = formatDateKey(getNextDateForDay(schedule.dayOfWeek, schedule.startTime));

  const related = bookings.filter(
    (booking) =>
      booking.scheduleId === schedule.id &&
      booking.lessonDate === lessonDate &&
      isActiveBooking(booking.status),
  );

  const maxPlaces = schedule.kind === 'individual' ? 1 : direction.maxPlaces ?? 0;

  return {
    lessonDate,
    maxPlaces,
    spotsLeft: getSpotsLeft({
      kind: schedule.kind,
      maxPlaces,
      taken: related.length,
      isBooked: schedule.isBooked,
    }),
    ...summarizeSlotBookings(related, children),
  };
};

const slotKey = (scheduleId, lessonDate) => `${scheduleId}_${lessonDate}`;

const appendTo = (map, key, value) => {
  const list = map.get(key);

  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
};

const groupActiveBookings = (bookings) => {
  const map = new Map();

  bookings.forEach((booking) => {
    if (!isActiveBooking(booking.status)) {
      return;
    }

    appendTo(map, slotKey(booking.scheduleId, booking.lessonDate), booking);
  });

  return map;
};

const indexCancellations = (cancellations) =>
  new Map(cancellations.map((item) => [slotKey(item.scheduleId, item.lessonDate), item]));

/**
 * Описание слота, общее для обоих видов занятий.
 * Различия (цена, места, подписи) приходят из describe().
 */
const expandSchedules = ({ kind, schedules, bookings, cancellations, children, dates, describe }) => {
  const bookingMap = groupActiveBookings(bookings);
  const cancellationMap = indexCancellations(cancellations);
  const events = [];

  schedules.forEach((schedule) => {
    const info = describe(schedule);

    if (!info) {
      return;
    }

    dates.forEach((date) => {
      if (getIsoDay(date) !== schedule.dayOfWeek) {
        return;
      }

      const lessonDate = formatDateKey(date);
      const key = slotKey(schedule.id, lessonDate);
      const slotBookings = bookingMap.get(key) ?? [];
      const cancellation = cancellationMap.get(key);

      events.push({
        id: `${kind}_${key}`,
        type: kind,
        scheduleId: schedule.id,
        lessonDate,
        name: info.activity.name,
        age: info.age,
        time: formatTime(schedule.startTime),
        endTime: formatTime(schedule.endTime),
        duration: info.duration,
        spotsLeft: getSpotsLeft({
          kind,
          maxPlaces: info.maxPlaces,
          taken: slotBookings.length,
          isBooked: schedule.isBooked,
          cancelled: Boolean(cancellation),
        }),
        maxPlaces: info.maxPlaces,
        category: info.category,
        teacher: getTeacherName(schedule.teacher),
        teacherAvatar: schedule.teacher?.avatar ?? null,
        description: info.activity.description ?? info.defaultDescription,
        image: info.activity.image,
        activityId: info.activity.id,
        dayOfWeek: schedule.dayOfWeek,
        status: schedule.status,
        cancelled: Boolean(cancellation),
        cancellationReason: cancellation?.reason ?? null,
        pricePerLesson: info.pricePerLesson,
        ...summarizeSlotBookings(slotBookings, children),
      });
    });
  });

  return events;
};

/* Цена группового занятия — из тарифа направления, как в админке сайта */
const describeGroup = (schedule) => {
  const activity = schedule.activity;

  if (!activity?.isActive) {
    return null;
  }

  return {
    activity,
    age: activity.subscriptionType?.name ?? 'Для всех',
    category: activity.subscriptionType?.name ?? 'Другие',
    duration: activity.durationMinutes,
    maxPlaces: activity.maxPlaces ?? 0,
    defaultDescription: 'Описание занятия пока не добавлено.',
    pricePerLesson: Number(activity.subscriptionType?.basePricePerLesson ?? 0),
  };
};

/* У индивидуального занятия своя цена — individual_activities.price_per_lesson */
const describeIndividual = (schedule) => {
  const individualActivity = schedule.individualActivity;
  const activity = individualActivity?.activity;

  if (!activity?.isActive || !individualActivity?.isActive) {
    return null;
  }

  return {
    activity,
    age: activity.subscriptionType?.name ?? 'Индивидуальное',
    category: 'Индивидуальное',
    duration: individualActivity.durationMinutes || activity.durationMinutes,
    maxPlaces: 1,
    defaultDescription: 'Индивидуальное занятие.',
    pricePerLesson: Number(individualActivity.pricePerLesson ?? 0),
  };
};

/**
 * Собирает список занятий на все даты диапазона.
 *
 * @returns массив CalendarEvent — та же структура, что и на сайте
 */
export const buildCalendarEvents = ({
  groupSchedules = [],
  individualSchedules = [],
  groupBookings = [],
  individualBookings = [],
  groupCancellations = [],
  individualCancellations = [],
  children = [],
  dates = [],
}) => {
  const common = { children, dates };

  const events = [
    ...expandSchedules({
      ...common,
      kind: 'group',
      schedules: groupSchedules,
      bookings: groupBookings,
      cancellations: groupCancellations,
      describe: describeGroup,
    }),
    ...expandSchedules({
      ...common,
      kind: 'individual',
      schedules: individualSchedules,
      bookings: individualBookings,
      cancellations: individualCancellations,
      describe: describeIndividual,
    }),
  ];

  return events.sort(
    (a, b) => a.lessonDate.localeCompare(b.lessonDate) || a.time.localeCompare(b.time),
  );
};

/** Группировка событий по датам: '2026-01-24' → список занятий */
export const groupEventsByDate = (events) => {
  const map = new Map();

  events.forEach((event) => appendTo(map, event.lessonDate, event));

  return map;
};
