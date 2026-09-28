import { useCallback, useRef, useState } from 'react';

import { describeSupabaseError } from '../utils/errors';
import * as BookingFlow from '../services/bookingFlow';
import { NotificationsService } from '../services/notifications.service';
import {
  buildBookedMessage,
  buildCancelledMessage,
  describeCancellation,
  getBlockReason,
  getOnceBlockReason,
  validateSelection,
} from '../utils/bookingRules';
import { logWarn } from '../utils/logger';
import { buildBookingNotification, buildCancelNotification } from '../utils/notify';

/*
 * Колонка subscription_id может быть обязательной в базе —
 * тогда разовая запись не вставится. Пользователю техника не нужна:
 * показываем, к кому обратиться.
 */
const isSubscriptionRequiredError = (error) =>
  error?.code === '23502' ||
  (String(error?.message ?? '').includes('subscription_id') &&
    String(error?.message ?? '').includes('null'));

const describeOnceError = (error) =>
  isSubscriptionRequiredError(error)
    ? 'Разовая запись пока недоступна. Обратитесь к администратору центра.'
    : describeSupabaseError(error, 'Не удалось записаться разово');

/**
 * Запись и отмена записи на занятие: состояние для интерфейса.
 *
 * Правила — в utils/bookingRules, последовательность запросов —
 * в services/bookingFlow. Кроме записи по подписке есть разовая:
 * те же строки, но без subscription_id и без списания занятия.
 */
export const useBooking = ({ userId, subscription, onSuccess, children = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /* Запись, отмену которой подтверждает пользователь */
  const [pendingCancel, setPendingCancel] = useState(null);

  /* Разовая запись, ожидающая подтверждения в окне */
  const [pendingOnce, setPendingOnce] = useState(null);

  /*
   * Синхронный флаг: двойное нажатие успевает прийти раньше,
   * чем React применит setLoading(true), и создало бы две записи.
   */
  const busyRef = useRef(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /**
   * Общая обёртка действия: блокировка, сброс сообщений,
   * перевод ошибки в понятный текст.
   */
  const run = useCallback(async (action, describeError) => {
    if (busyRef.current) {
      return null;
    }

    busyRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      return await action();
    } catch (actionError) {
      logWarn('booking', actionError);
      setError(describeError(actionError));

      return null;
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  /*
   * Уведомление — как на сайте (notifications + user_notifications).
   * Ошибку не пробрасываем: запись уже прошла.
   */
  const notify = useCallback(
    async (payload) => {
      try {
        await NotificationsService.createForUser({ userId, ...payload });
      } catch (notifyError) {
        logWarn('booking: уведомление', notifyError);
      }
    },
    [userId],
  );

  const getChildNames = useCallback(
    (childIds = []) =>
      childIds.map(
        (childId) => children.find((item) => item.id === childId)?.firstName ?? 'Ребёнок',
      ),
    [children],
  );

  /** Общий путь обычной и разовой записи */
  const bookWith = useCallback(
    async ({ event, childIds, once }) => {
      reset();

      if (!userId || !event) {
        return null;
      }

      const problem =
        validateSelection({ event, childIds }) ||
        (!once && !subscription ? 'Для записи необходимо оформить активную подписку.' : null);

      if (problem) {
        setError(problem);
        return null;
      }

      return run(
        async () => {
          const created = once
            ? await BookingFlow.bookOnce({ event, childIds, userId })
            : await BookingFlow.bookWithSubscription({
                event,
                childIds,
                userId,
                subscriptionId: subscription.id,
              });

          setSuccess(buildBookedMessage(childIds.length, { once }));

          await notify(
            buildBookingNotification({
              childNames: getChildNames(childIds),
              lessonName: event.name,
              lessonDate: event.lessonDate,
              time: event.time,
              once,
            }),
          );

          await onSuccess?.();

          /*
           * Возвращаем сами записи: экран подмешает их в список,
           * и «Вы записаны» появится, даже если перезагрузка не успела.
           */
          return created;
        },
        once
          ? describeOnceError
          : (bookingError) =>
              describeSupabaseError(bookingError, 'Не удалось записаться на занятие'),
      );
    },
    [getChildNames, notify, onSuccess, reset, run, subscription, userId],
  );

  const book = useCallback((params) => bookWith({ ...params, once: false }), [bookWith]);

  const bookOnce = useCallback((params) => bookWith({ ...params, once: true }), [bookWith]);

  /* Отмена записи в два шага: окно подтверждения рисует экран */
  const requestCancel = useCallback(({ event, childId, childName }) => {
    if (!event) {
      return;
    }

    const bookingId = event.bookingIdsByChild?.[childId];

    if (!bookingId) {
      setError('Не удалось найти запись на занятие.');
      return;
    }

    setError(null);
    setSuccess(null);
    setPendingCancel({ event, childId, childName, bookingId });
  }, []);

  const dismissCancel = useCallback(() => {
    if (!busyRef.current) {
      setPendingCancel(null);
    }
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!pendingCancel || !userId) {
      return false;
    }

    const { event, childId, childName, bookingId } = pendingCancel;

    const result = await run(
      async () => {
        const refunded = await BookingFlow.cancelBooking({ event, bookingId, userId });

        setSuccess(buildCancelledMessage(childName, refunded));

        await notify(
          buildCancelNotification({
            childName: childName || 'Ребёнок',
            lessonName: event.name,
            lessonDate: event.lessonDate,
          }),
        );

        await onSuccess?.();

        return { childId, bookingId };
      },
      (cancelError) => describeSupabaseError(cancelError, 'Не удалось отменить запись'),
    );

    setPendingCancel(null);

    return result ?? false;
  }, [notify, onSuccess, pendingCancel, run, userId]);

  /* Разовая запись тоже в два шага: сначала окно с ценой и датой */
  const requestBookOnce = useCallback(({ event, childIds }) => {
    if (!event) {
      return;
    }

    setError(null);
    setSuccess(null);
    setPendingOnce({ event, childIds });
  }, []);

  const dismissBookOnce = useCallback(() => {
    if (!busyRef.current) {
      setPendingOnce(null);
    }
  }, []);

  const confirmBookOnce = useCallback(async () => {
    if (!pendingOnce) {
      return null;
    }

    const created = await bookOnce(pendingOnce);

    /* При ошибке окно остаётся открытым: причина видна прямо в нём */
    if (created) {
      setPendingOnce(null);
    }

    return created;
  }, [bookOnce, pendingOnce]);

  const cancelDialogProps = {
    visible: Boolean(pendingCancel),
    title: 'Отменить запись?',
    description: pendingCancel ? describeCancellation(pendingCancel) : null,
    confirmLabel: 'Да, отменить',
    cancelLabel: 'Отмена',
    loading,
  };

  return {
    book,
    bookOnce,
    requestBookOnce,
    confirmBookOnce,
    dismissBookOnce,
    pendingOnce,
    requestCancel,
    confirmCancel,
    dismissCancel,
    pendingCancel,
    cancelDialogProps,
    loading,
    error,
    success,
    reset,
    getBlockReason: (event) => getBlockReason(event, subscription),
    getOnceBlockReason,
  };
};
