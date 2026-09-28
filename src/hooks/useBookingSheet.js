import { useCallback, useState } from 'react';

import { useBooking } from './useBooking';

/**
 * Связка окна занятия (LessonSheet) с записью.
 *
 * Одно и то же окно открывается из календаря и из карточки
 * направления: выбор детей, запись по подписке, разовая запись
 * и отмена устроены одинаково. Экран передаёт выбранное занятие
 * и получает готовые пропсы для трёх окон.
 *
 * @param {object} params
 * @param {object|null} params.event выбранное занятие
 * @param {object[]} params.children дети пользователя
 * @param {Function} params.onCreated (created, event) — подмешать новые записи в данные экрана
 */
export const useBookingSheet = ({
  userId,
  subscription,
  children,
  event,
  onSuccess,
  onCreated,
}) => {
  const [selectedChildIds, setSelectedChildIds] = useState([]);

  const booking = useBooking({ userId, subscription, onSuccess, children });

  const childName = (childId) =>
    children.find((item) => item.id === childId)?.firstName ?? 'Ребёнок';

  /* Индивидуальное занятие — только один ребёнок, групповое — сколько угодно */
  const toggleChild = useCallback(
    (childId) => {
      if (!event) {
        return;
      }

      setSelectedChildIds((current) => {
        if (current.includes(childId)) {
          return current.filter((id) => id !== childId);
        }

        return event.type === 'individual' ? [childId] : [...current, childId];
      });
    },
    [event],
  );

  const afterCreate = (created) => {
    if (!created) {
      return;
    }

    setSelectedChildIds([]);
    onCreated?.(created, event);
  };

  const hasSchedule = event?.hasSchedule !== false;
  const onceBlockReason = booking.getOnceBlockReason(event);

  const sheetProps = {
    visible: Boolean(event),
    event,
    childrenList: children,
    selectedChildIds,
    onToggleChild: toggleChild,
    onBook: async () => afterCreate(await booking.book({ event, childIds: selectedChildIds })),
    /* Разовая запись доступна только у занятия с расписанием */
    onBookOnce: hasSchedule
      ? () => booking.requestBookOnce({ event, childIds: selectedChildIds })
      : null,
    onCancelBooking: (childId) =>
      booking.requestCancel({ event, childId, childName: childName(childId) }),
    loading: booking.loading,
    error: booking.error,
    success: booking.success,
    canBook: Boolean(subscription),
    /* Без расписания подсказки про подписку и места не нужны */
    blockReason: hasSchedule ? booking.getBlockReason(event) : null,
    canBookOnce: !onceBlockReason,
    onceBlockReason: hasSchedule ? onceBlockReason : null,
  };

  const onceSheetProps = {
    visible: Boolean(booking.pendingOnce),
    event: booking.pendingOnce?.event ?? event,
    childNames: (booking.pendingOnce?.childIds ?? selectedChildIds).map(childName),
    loading: booking.loading,
    error: booking.error,
    onConfirm: async () => afterCreate(await booking.confirmBookOnce()),
    onCancel: booking.dismissBookOnce,
  };

  const cancelDialogProps = {
    ...booking.cancelDialogProps,
    onConfirm: booking.confirmCancel,
    onCancel: booking.dismissCancel,
  };

  return {
    booking,
    selectedChildIds,
    setSelectedChildIds,
    sheetProps,
    onceSheetProps,
    cancelDialogProps,
  };
};
