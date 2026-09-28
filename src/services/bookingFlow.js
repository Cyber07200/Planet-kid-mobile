import { getSubscriptionProblem, isRefusal, refuse } from '../utils/bookingRules';
import { logWarn } from '../utils/logger';
import { BookingsService } from './bookings.service';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Сценарии записи и отмены: последовательность запросов
 * без состояния интерфейса. Хук useBooking только вызывает их
 * и показывает результат.
 */

/**
 * Проверка, которой нет на сайте: он просто вставляет запись.
 * Мы проверяем слот, дубли и места, но сама проверка не должна
 * мешать записи: если запрос не выполнился (например, чтение
 * закрыто политикой RLS), продолжаем — как на сайте.
 * Пробрасываем только собственный отказ.
 */
const softCheck = async (label, check) => {
  try {
    await check();
  } catch (error) {
    if (isRefusal(error)) {
      throw error;
    }

    logWarn(`booking: проверка «${label}» недоступна`, error);
  }
};

/**
 * Вставка записей с предварительными проверками.
 *
 * @returns {Promise<object[]>} созданные записи
 */
const createWithChecks = async ({ event, childIds, userId, subscriptionId }) => {
  const kind = event.type;
  const { scheduleId, lessonDate } = event;

  await softCheck('слот', async () => {
    const status = await BookingsService.getScheduleStatus({ scheduleId, kind });

    if (status && status !== 'scheduled') {
      throw refuse('Это занятие больше недоступно для записи.');
    }
  });

  await softCheck('дубли', async () => {
    const booked = await BookingsService.findBookedChildIds({
      scheduleId,
      kind,
      childIds,
      lessonDate,
      userId,
    });

    if (booked.length > 0) {
      throw refuse(
        booked.length === 1
          ? 'Этот ребёнок уже записан на выбранное занятие.'
          : 'Выбранные дети уже записаны на это занятие.',
      );
    }
  });

  await softCheck('места', async () => {
    const taken = await BookingsService.countActiveBookings(kind, scheduleId, lessonDate);

    if (kind === 'individual' && taken > 0) {
      throw refuse('Это время уже занято, выберите другое.');
    }

    if (kind === 'group' && event.maxPlaces > 0 && taken + childIds.length > event.maxPlaces) {
      throw refuse('На это занятие уже нет свободных мест.');
    }
  });

  return BookingsService.createBookings({
    kind,
    scheduleId,
    childIds,
    userId,
    subscriptionId,
    lessonDate,
  });
};

/**
 * Запись по подписке: перепроверка подписки в базе, вставка
 * и списание занятий. Если списать не удалось — откат записи,
 * иначе ребёнок остался бы записан без списания.
 */
export const bookWithSubscription = async ({ event, childIds, userId, subscriptionId }) => {
  const fresh = await SubscriptionsService.getFreshSubscription(subscriptionId, userId);
  const problem = getSubscriptionProblem(fresh, childIds.length, event.lessonDate);

  if (problem) {
    throw refuse(problem);
  }

  const created = await createWithChecks({
    event,
    childIds,
    userId,
    subscriptionId: fresh.id,
  });

  try {
    await SubscriptionsService.decreaseLessons(fresh.id, userId, childIds.length);
  } catch (error) {
    await BookingsService.rollbackBookings({
      kind: event.type,
      scheduleId: event.scheduleId,
      lessonDate: event.lessonDate,
      childIds,
      userId,
    });

    throw error;
  }

  return created;
};

/** Разовая запись: без подписки и без списания с баланса */
export const bookOnce = ({ event, childIds, userId }) =>
  createWithChecks({ event, childIds, userId, subscriptionId: null });

/**
 * Отмена записи. Занятие возвращается на баланс только у записи
 * по подписке: у разовой subscription_id пустой.
 *
 * @returns {Promise<boolean>} вернулось ли занятие на подписку
 */
export const cancelBooking = async ({ event, bookingId, userId }) => {
  const subscriptionId = await BookingsService.cancelBooking({
    bookingId,
    kind: event.type,
    userId,
    scheduleId: event.scheduleId,
  });

  if (subscriptionId) {
    await SubscriptionsService.increaseLessons(subscriptionId, userId, 1);
  }

  return Boolean(subscriptionId);
};
