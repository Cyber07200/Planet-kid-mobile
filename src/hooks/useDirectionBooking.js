import { useCallback, useMemo, useState } from 'react';

import { useBookingSheet } from './useBookingSheet';
import { buildDirectionSlot, getTeacherName } from '../services/calendar';
import { formatTime } from '../utils/date';
import { isSubscriptionActive, mergeBookings } from '../utils/status';

const EMPTY_SLOT = {
  hasSchedule: false,
  type: 'group',
  scheduleId: null,
  lessonDate: null,
  dayOfWeek: null,
  time: '',
  endTime: '',
  spotsLeft: 0,
  teacher: 'Преподаватель',
  teacherAvatar: null,
  bookedChildIds: [],
  bookedChildren: [],
  bookingIdsByChild: {},
  oneOffChildIds: [],
};

/**
 * Объект занятия для окна записи — та же структура, что и в календаре.
 *
 * Если у направления нет ни одного слота, объект всё равно собирается
 * (hasSchedule: false): иначе карточка выглядела бы некликабельной.
 */
const buildDirectionEvent = (direction, schedule, data) => {
  const base = {
    activityId: direction.id,
    name: direction.name,
    age: direction.subscriptionType?.name ?? 'Для всех',
    duration: direction.durationMinutes,
    category: direction.subscriptionType?.name ?? 'Другие',
    description: direction.description || 'Описание направления пока не добавлено.',
    image: direction.image,
    status: 'scheduled',
    cancelled: false,
    cancellationReason: null,
    pricePerLesson: Number(direction.subscriptionType?.basePricePerLesson ?? 0),
  };

  if (!schedule) {
    return {
      ...base,
      ...EMPTY_SLOT,
      id: `direction_${direction.id}`,
      maxPlaces: direction.maxPlaces ?? 0,
    };
  }

  const slot = buildDirectionSlot({
    direction,
    schedule,
    bookings: data?.bookings,
    children: data?.children,
  });

  return {
    ...base,
    ...slot,
    id: `${schedule.id}_${slot.lessonDate}`,
    hasSchedule: true,
    type: schedule.kind,
    scheduleId: schedule.id,
    dayOfWeek: schedule.dayOfWeek,
    time: formatTime(schedule.startTime),
    endTime: formatTime(schedule.endTime),
    teacher: getTeacherName(schedule.teacher),
    teacherAvatar: schedule.teacher?.avatar ?? null,
    /* Цена слота уже посчитана в CatalogService */
    pricePerLesson: Number(schedule.pricePerLesson ?? base.pricePerLesson),
  };
};

/**
 * Запись на занятие из карточки направления.
 *
 * Одна и та же карточка открывается на «Направлениях», на странице
 * направления и в «Ближайших занятиях», поэтому логика собрана здесь.
 *
 * @param {object} params
 * @param {object} params.data данные экрана: directions, children, bookings, subscription
 * @param {Function} params.setData обновление данных экрана (мгновенный статус записи)
 * @param {Function} params.refresh перезагрузка данных после записи
 */
export const useDirectionBooking = ({ userId, data, setData, refresh }) => {
  const [selectedDirectionId, setSelectedDirectionId] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  const children = useMemo(() => data?.children ?? [], [data?.children]);

  const activeSubscription = isSubscriptionActive(data?.subscription)
    ? data.subscription
    : null;

  const selectedDirection =
    data?.directions?.find((item) => item.id === selectedDirectionId) ?? null;

  const selectedSchedule = selectedDirection
    ? selectedDirection.schedules.find((item) => item.id === selectedScheduleId) ??
      selectedDirection.schedules[0] ??
      null
    : null;

  const selectedEvent = useMemo(
    () =>
      selectedDirection ? buildDirectionEvent(selectedDirection, selectedSchedule, data) : null,
    [data, selectedDirection, selectedSchedule],
  );

  /* Свежие записи подмешиваем в данные экрана — статус меняется сразу */
  const onCreated = useCallback(
    (created) =>
      setData?.((current) =>
        current ? { ...current, bookings: mergeBookings(current.bookings, created) } : current,
      ),
    [setData],
  );

  const { booking, setSelectedChildIds, sheetProps, onceSheetProps, cancelDialogProps } =
    useBookingSheet({
      userId,
      subscription: activeSubscription,
      children,
      event: selectedEvent,
      onSuccess: refresh,
      onCreated,
    });

  /**
   * Открытие карточки направления.
   * scheduleId — если пользователь выбрал конкретное занятие.
   */
  const openDirection = (direction, scheduleId = null) => {
    booking.reset();
    setSelectedDirectionId(direction.id);
    setSelectedScheduleId(scheduleId ?? direction.schedules?.[0]?.id ?? null);

    /* Ребёнок один — сразу отмечаем его, как на сайте */
    setSelectedChildIds(children.length === 1 ? [children[0].id] : []);
  };

  /* Во время записи закрыть окно нельзя */
  const closeDirection = () => {
    if (booking.loading) {
      return;
    }

    setSelectedDirectionId(null);
    setSelectedScheduleId(null);
    setSelectedChildIds([]);
    booking.reset();
  };

  return {
    activeSubscription,
    booking,
    openDirection,
    closeDirection,
    selectedDirection,
    selectedEvent,
    sheetProps: {
      ...sheetProps,
      onClose: closeDirection,
      schedules: selectedDirection?.schedules ?? [],
      selectedScheduleId: selectedSchedule?.id ?? null,
      onSelectSchedule: (schedule) => {
        booking.reset();
        setSelectedScheduleId(schedule.id);
      },
    },
    onceSheetProps,
    cancelDialogProps,
  };
};
