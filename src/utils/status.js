/**
 * Статусы записей и подписок.
 *
 * На сайте статусы проверяются в нескольких местах
 * с небольшими различиями (booked/confirmed, cancelled/canceled).
 * Собираем это в одном месте.
 */

import { getStartOfDay, parseDateKey } from './date';

const CANCELLED = ['cancelled', 'canceled', 'cancel'];

export const isCancelledStatus = (status) => {
  if (!status) {
    return false;
  }

  return CANCELLED.includes(String(status).toLowerCase());
};

/**
 * Активная запись на занятие.
 *
 * booked — основной статус текущей схемы.
 * confirmed оставлен для совместимости со старыми данными
 * (так же, как в CalendarPage.tsx на сайте).
 */
export const ACTIVE_BOOKING_STATUSES = ['booked', 'confirmed'];

export const isActiveBooking = (status) => ACTIVE_BOOKING_STATUSES.includes(status);

/**
 * Подписка «действует прямо сейчас».
 *
 * Повторяет isSubscriptionCurrentlyActive из HomePage.tsx.
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) {
    return false;
  }

  if (!subscription.isActive) {
    return false;
  }

  if (!subscription.endDate) {
    return true;
  }

  const today = getStartOfDay(new Date());
  const endDate = parseDateKey(subscription.endDate);

  if (!endDate) {
    return false;
  }

  return endDate >= today;
};

/**
 * Ближайшие записи: активные, не раньше сегодняшнего дня,
 * по дате и времени начала — как в HomePage.tsx на сайте.
 */
export const getUpcomingBookings = (bookings = []) => {
  const today = getStartOfDay(new Date());

  return bookings
    .filter((booking) => {
      const lessonDate = parseDateKey(booking.lessonDate);

      return isActiveBooking(booking.status) && lessonDate !== null && lessonDate >= today;
    })
    .sort(
      (a, b) =>
        a.lessonDate.localeCompare(b.lessonDate) ||
        String(a.startTime ?? '').localeCompare(String(b.startTime ?? '')),
    );
};

/**
 * Подмешивает свежесозданные записи в уже загруженный список.
 *
 * Нужно сразу после записи на занятие: список с сервера
 * перезагружается, но если он почему-то задержался, статус
 * «Вы записаны» всё равно появится немедленно.
 * Дубли по id не добавляются.
 */
export const mergeBookings = (current = [], created = []) => {
  if (!created || created.length === 0) {
    return current;
  }

  const known = new Set((current ?? []).map((item) => item.id));

  const fresh = created.filter((item) => item?.id && !known.has(item.id));

  return fresh.length > 0 ? [...(current ?? []), ...fresh] : current;
};
