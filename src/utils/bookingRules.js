import { getBookingRange } from '../services/calendar';
import { parseDateKey } from './date';
import { plural } from './format';

/**
 * Правила записи на занятие — чистые функции без React и сети.
 *
 * Перенесены из CalendarPage.handleBooking (веб): горизонт записи,
 * отменённое занятие, подписка, свободные места, дубли и
 * ограничение «один ребёнок» для индивидуальных занятий.
 */

const CANCELLED_TEXT = 'Это занятие отменено и недоступно для записи.';
const NO_SPOTS_TEXT = 'На это занятие уже нет свободных мест.';
const ENDS_EARLIER_TEXT = 'Ваша подписка заканчивается раньше даты выбранного занятия.';

const lessonsWord = (count) => plural(count, 'занятие', 'занятия', 'занятий');

const isFullyBooked = (event) =>
  event.spotsLeft <= 0 && (event.bookedChildren?.length ?? 0) === 0;

const endsBefore = (endDateKey, lessonDateKey) => {
  const end = parseDateKey(endDateKey);
  const lesson = parseDateKey(lessonDateKey);

  return Boolean(end && lesson && end < lesson);
};

/**
 * Наш собственный отказ (не ошибка базы).
 *
 * Пометка отличает «мы решили не записывать» (нет мест, ребёнок
 * уже записан) от сбоя вспомогательного запроса: база умеет отвечать
 * вовсе без кода и текста, и такой ответ нельзя принимать за отказ.
 */
export const refuse = (message) => Object.assign(new Error(message), { bookingRefusal: true });

export const isRefusal = (error) => Boolean(error?.bookingRefusal);

/** Почему недоступна запись по подписке; null — всё в порядке */
export const getBlockReason = (event, subscription) => {
  if (!event) {
    return null;
  }

  if (event.cancelled) {
    return CANCELLED_TEXT;
  }

  if (!subscription) {
    return 'Для записи необходимо оформить активную подписку.';
  }

  if (subscription.lessonsLeft <= 0) {
    return 'У вас закончились занятия по текущей подписке.';
  }

  if (endsBefore(subscription.endDate, event.lessonDate)) {
    return ENDS_EARLIER_TEXT;
  }

  return isFullyBooked(event) ? NO_SPOTS_TEXT : null;
};

/** Почему недоступна разовая запись: подписка тут ни при чём */
export const getOnceBlockReason = (event) => {
  if (!event) {
    return null;
  }

  if (event.cancelled) {
    return CANCELLED_TEXT;
  }

  return isFullyBooked(event) ? NO_SPOTS_TEXT : null;
};

/** Проверки, общие для обычной и разовой записи; null — можно продолжать */
export const validateSelection = ({ event, childIds }) => {
  const { today, maxDate } = getBookingRange();
  const lessonDate = parseDateKey(event.lessonDate);

  if (!lessonDate || lessonDate < today || lessonDate > maxDate) {
    return 'Записаться можно только на занятия в течение ближайшего месяца.';
  }

  if (event.cancelled) {
    return CANCELLED_TEXT;
  }

  if (!childIds?.length) {
    return 'Выберите хотя бы одного ребёнка.';
  }

  if (event.type === 'individual' && childIds.length > 1) {
    return 'На индивидуальное занятие можно записать только одного ребёнка.';
  }

  if (event.spotsLeft < childIds.length) {
    return `Свободно мест: ${event.spotsLeft}. Выберите меньше детей или другое время.`;
  }

  if (childIds.some((childId) => event.bookedChildIds.includes(childId))) {
    return 'Один из выбранных детей уже записан на это занятие.';
  }

  return null;
};

/** Свежая подписка из базы позволяет записать столько детей? */
export const getSubscriptionProblem = (fresh, childCount, lessonDateKey) => {
  if (!fresh) {
    return 'Активная подписка не найдена';
  }

  if (fresh.lessonsLeft <= 0) {
    return 'В вашей подписке закончились занятия';
  }

  if (childCount > fresh.lessonsLeft) {
    return `У вас осталось только ${fresh.lessonsLeft} ${lessonsWord(fresh.lessonsLeft)}.`;
  }

  if (endsBefore(fresh.endDate, lessonDateKey)) {
    return ENDS_EARLIER_TEXT;
  }

  return null;
};

/* Формулировки успеха взяты с сайта (DirectionsPage) */
export const buildBookedMessage = (childCount, { once = false } = {}) => ({
  title: childCount === 1 ? 'Ребёнок успешно записан!' : 'Дети успешно записаны!',
  message: once
    ? 'Занятие добавлено в расписание. Это разовая запись: подписка не списывается, занятие оплачивается в центре перед началом.'
    : childCount === 1
      ? 'Занятие добавлено в расписание. С абонемента списано одно занятие.'
      : `Занятия добавлены в расписание. С абонемента списано ${childCount} ${lessonsWord(childCount)}.`,
});

export const buildCancelledMessage = (childName, refunded) => ({
  title: 'Запись отменена',
  message: refunded
    ? `Запись ${childName || 'ребёнка'} отменена, занятие вернулось на баланс подписки.`
    : `Запись ${childName || 'ребёнка'} отменена, место освободилось.`,
});

/** Текст окна подтверждения отмены */
export const describeCancellation = ({ event, childId, childName }) => {
  const who = childName || 'ребёнка';

  return event.oneOffChildIds?.includes(childId)
    ? `Запись ${who} на разовое занятие «${event.name}» будет отменена. Место освободится, стоимость занятия не возвращается автоматически — уточните это у администратора.`
    : `Запись ${who} на занятие «${event.name}» будет отменена, а одно занятие вернётся на баланс подписки.`;
};
