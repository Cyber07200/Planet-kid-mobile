import { supabase } from '../config/supabase';
import { normalizeRelation } from '../utils/format';
import { logWarn } from '../utils/logger';
import { ACTIVE_BOOKING_STATUSES, isCancelledStatus } from '../utils/status';
import { mapBooking, mapCancellation } from './mappers';

/**
 * Записи на занятия.
 *
 * Логика записи/отмены повторяет CalendarPage.handleBooking /
 * handleCancelBooking с сайта. Групповые и индивидуальные записи
 * устроены одинаково и отличаются только таблицами — поэтому
 * методы принимают kind ('group' | 'individual').
 */

const TABLES = {
  group: {
    bookings: 'group_bookings',
    schedules: 'group_schedules',
    cancellations: 'group_schedule_cancellations',
  },
  individual: {
    bookings: 'individual_bookings',
    schedules: 'individual_schedules',
    cancellations: 'individual_schedule_cancellations',
  },
};

const tablesFor = (kind) => (kind === 'group' ? TABLES.group : TABLES.individual);

const BOOKING_FIELDS =
  'id, schedule_id, child_id, user_id, subscription_id, status, teacher_payout, lesson_date, created_at';

/* Префикс локальной копии записи, которую база не дала перечитать */
const LOCAL_ID_PREFIX = 'local_';

const NO_ROWS = Promise.resolve({ data: [], error: null });

const rowsOrThrow = ({ data, error }) => {
  if (error) {
    throw error;
  }

  return data ?? [];
};

/**
 * Пустой ответ базы: ни кода, ни текста.
 *
 * Так выглядит, например, отказ политики доступа для запроса без
 * тела ответа ({"message": ""}). Это не значит, что вставка
 * не прошла, — поэтому после такой ошибки перечитываем таблицу.
 */
const isEmptyError = (error) => !error?.code && !String(error?.message ?? '').trim();

/** Активные записи на слот и дату для указанных детей */
const selectSlotBookings = ({ kind, scheduleId, childIds, userId, lessonDate }) =>
  supabase
    .from(tablesFor(kind).bookings)
    .select(BOOKING_FIELDS)
    .eq('schedule_id', scheduleId)
    .eq('user_id', userId)
    .eq('lesson_date', lessonDate)
    .in('child_id', childIds);

const activeRows = (rows, kind) =>
  rows.filter((row) => !isCancelledStatus(row.status)).map((row) => mapBooking(row, kind));

const setIndividualSlotBooked = async (scheduleId, isBooked) => {
  const { error } = await supabase
    .from(TABLES.individual.schedules)
    .update({ is_booked: isBooked })
    .eq('id', scheduleId);

  if (error) {
    logWarn('bookings: individual_schedules', error);
  }
};

/** Строки расписания → Map schedule_id → { время, день, занятие } */
const toDetailsMap = (rows, getActivity) =>
  new Map(
    rows.map((row) => {
      const { activity, activityTypeId } = getActivity(row);

      return [
        row.id,
        {
          startTime: row.start_time,
          endTime: row.end_time,
          dayOfWeek: row.day_of_week,
          activityId: activity?.id ?? activityTypeId ?? null,
          activityName: activity?.name ?? null,
          activityImage: activity?.image ?? null,
        },
      ];
    }),
  );

export const BookingsService = {
  async getBookingsInRange(kind, scheduleIds, fromDate, toDate) {
    if (!scheduleIds?.length) {
      return [];
    }

    const rows = rowsOrThrow(
      await supabase
        .from(tablesFor(kind).bookings)
        .select(BOOKING_FIELDS)
        .in('schedule_id', scheduleIds)
        .gte('lesson_date', fromDate)
        .lte('lesson_date', toDate),
    );

    return rows.map((row) => mapBooking(row, kind));
  },

  async getCancellations(kind, scheduleIds, fromDate, toDate) {
    if (!scheduleIds?.length) {
      return [];
    }

    const rows = rowsOrThrow(
      await supabase
        .from(tablesFor(kind).cancellations)
        .select('id, schedule_id, lesson_date, reason')
        .in('schedule_id', scheduleIds)
        .gte('lesson_date', fromDate)
        .lte('lesson_date', toDate),
    );

    return rows.map(mapCancellation);
  },

  /**
   * Все записи детей пользователя — для профиля, главной и направлений.
   *
   * Сначала сами записи (без join'ов — такой запрос не ломается
   * из-за недоступной связи), затем отдельно названия и время.
   * Если второй шаг не удался, записи вернутся без названия занятия.
   */
  async getBookingsForChildren(userId, childIds) {
    if (!childIds?.length) {
      return [];
    }

    const selectForKind = (kind) =>
      supabase
        .from(tablesFor(kind).bookings)
        .select(BOOKING_FIELDS)
        .in('child_id', childIds)
        .eq('user_id', userId)
        .order('lesson_date', { ascending: true })
        .limit(200);

    const [groupResult, individualResult] = await Promise.all([
      selectForKind('group'),
      selectForKind('individual'),
    ]);

    const all = [
      ...rowsOrThrow(groupResult).map((row) => mapBooking(row, 'group')),
      ...rowsOrThrow(individualResult).map((row) => mapBooking(row, 'individual')),
    ];

    if (all.length === 0) {
      return [];
    }

    const idsOf = (kind) =>
      all.filter((booking) => booking.kind === kind).map((booking) => booking.scheduleId);

    const details = await this.getScheduleDetails({
      groupIds: idsOf('group'),
      individualIds: idsOf('individual'),
    }).catch((error) => {
      logWarn('bookings: описание занятий', error);

      return { group: new Map(), individual: new Map() };
    });

    return all.map((booking) => {
      const info = details[booking.kind].get(booking.scheduleId);

      return {
        ...booking,
        startTime: info?.startTime ?? null,
        endTime: info?.endTime ?? null,
        dayOfWeek: info?.dayOfWeek ?? null,
        activityId: info?.activityId ?? null,
        activityName: info?.activityName ?? null,
        activityImage: info?.activityImage ?? null,
      };
    });
  },

  /** Описание слотов расписания по их id: две Map schedule_id → данные */
  async getScheduleDetails({ groupIds = [], individualIds = [] }) {
    const uniqueGroup = [...new Set(groupIds.filter(Boolean))];
    const uniqueIndividual = [...new Set(individualIds.filter(Boolean))];

    const [groupResult, individualResult] = await Promise.all([
      uniqueGroup.length > 0
        ? supabase
            .from(TABLES.group.schedules)
            .select(
              'id, start_time, end_time, day_of_week, activity_type_id, activity_types ( id, name, image )',
            )
            .in('id', uniqueGroup)
        : NO_ROWS,

      uniqueIndividual.length > 0
        ? supabase
            .from(TABLES.individual.schedules)
            .select(
              'id, start_time, end_time, day_of_week, individual_activity_id, individual_activities ( id, activity_type_id, activity_types ( id, name, image ) )',
            )
            .in('id', uniqueIndividual)
        : NO_ROWS,
    ]);

    return {
      group: toDetailsMap(rowsOrThrow(groupResult), (row) => ({
        activity: normalizeRelation(row.activity_types),
        activityTypeId: row.activity_type_id,
      })),
      individual: toDetailsMap(rowsOrThrow(individualResult), (row) => {
        const individualActivity = normalizeRelation(row.individual_activities);

        return {
          activity: normalizeRelation(individualActivity?.activity_types),
          activityTypeId: individualActivity?.activity_type_id,
        };
      }),
    };
  },

  /**
   * Запись детей на занятие.
   *
   * subscriptionId === null — разовая запись: та же таблица и те же
   * поля, просто без привязки к подписке. Индивидуальный слот
   * после записи помечается занятым — так же, как на сайте.
   *
   * @returns {Promise<object[]>} созданные записи
   */
  async createBookings({ kind, scheduleId, childIds, userId, subscriptionId, lessonDate }) {
    const records = childIds.map((childId) => ({
      schedule_id: scheduleId,
      child_id: childId,
      user_id: userId,
      subscription_id: subscriptionId ?? null,
      status: 'booked',
      teacher_payout: 0,
      lesson_date: lessonDate,
    }));

    const slot = { kind, scheduleId, childIds, userId, lessonDate };

    /*
     * Вставка без .select(), как на сайте: если политика RLS
     * разрешает вставку, но не чтение, insert(...).select(...)
     * вернул бы ошибку, хотя строка уже создана.
     */
    const { error } = await supabase.from(tablesFor(kind).bookings).insert(records);

    if (error) {
      /* 23505 — уникальный индекс базы: такая запись уже есть */
      if (error.code === '23505') {
        throw new Error('Этот ребёнок уже записан на выбранное занятие.');
      }

      /* Пустая ошибка — строка могла записаться, проверяем по базе */
      const saved = isEmptyError(error) ? await this.findExistingBookings(slot) : [];

      if (saved.length === 0) {
        throw error;
      }

      return saved;
    }

    if (kind === 'individual') {
      await setIndividualSlotBooked(scheduleId, true);
    }

    return this.readBackBookings(slot, records);
  },

  /** Уже существующие активные записи; недоступное чтение — пустой список */
  async findExistingBookings(slot) {
    const { data, error } = await selectSlotBookings(slot);

    if (error) {
      logWarn('bookings: проверка вставки', error);

      return [];
    }

    return activeRows(data ?? [], slot.kind);
  },

  /**
   * Только что созданные записи — нужны лишь для мгновенного статуса
   * «Вы записаны». Если чтение закрыто, возвращаем локальную копию:
   * строка в базе уже есть, настоящий id придёт при перезагрузке.
   */
  async readBackBookings(slot, records) {
    const saved = await this.findExistingBookings(slot);

    if (saved.length > 0) {
      return saved;
    }

    return records.map((record, index) =>
      mapBooking(
        { id: `${LOCAL_ID_PREFIX}${slot.scheduleId}_${record.child_id}_${index}`, ...record },
        slot.kind,
      ),
    );
  },

  /**
   * Отмена записи: status → cancelled (строка не удаляется).
   *
   * @returns {Promise<string|null>} subscription_id отменённой записи
   */
  async cancelBooking({ bookingId, kind, userId, scheduleId }) {
    const table = tablesFor(kind).bookings;

    const { data: existing, error: fetchError } = await supabase
      .from(table)
      .select('id, subscription_id')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    if (kind === 'individual' && scheduleId) {
      await setIndividualSlotBooked(scheduleId, false);
    }

    return existing?.subscription_id ?? null;
  },

  /**
   * Откат только что созданных записей, если не удалось списать
   * занятия с подписки. Ищем по слоту, а не по id: у записи,
   * которую база не дала перечитать, id только локальный.
   */
  async rollbackBookings(slot) {
    const { error } = await supabase
      .from(tablesFor(slot.kind).bookings)
      .update({ status: 'cancelled' })
      .eq('schedule_id', slot.scheduleId)
      .eq('user_id', slot.userId)
      .eq('lesson_date', slot.lessonDate)
      .in('child_id', slot.childIds)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) {
      logWarn('bookings: откат записей', error);
      return;
    }

    if (slot.kind === 'individual') {
      await setIndividualSlotBooked(slot.scheduleId, false);
    }
  },

  /**
   * Статус слота прямо сейчас — как DirectionsPage.handleBooking (веб):
   * администратор мог снять занятие, пока карточка была открыта.
   *
   * @returns {Promise<string|null>} статус либо null, если слота нет
   */
  async getScheduleStatus({ scheduleId, kind }) {
    if (!scheduleId) {
      return null;
    }

    const { data, error } = await supabase
      .from(tablesFor(kind).schedules)
      .select('id, status')
      .eq('id', scheduleId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.status ?? null;
  },

  /**
   * Дети, у которых уже есть активная запись на этот слот и дату
   * (например, записали с другого устройства).
   *
   * @returns {Promise<string[]>} id детей
   */
  async findBookedChildIds({ scheduleId, kind, childIds, lessonDate, userId }) {
    if (!scheduleId || !childIds?.length) {
      return [];
    }

    const rows = rowsOrThrow(
      await selectSlotBookings({ kind, scheduleId, childIds, userId, lessonDate }),
    );

    return activeRows(rows, kind).map((booking) => booking.childId);
  },

  /** Число активных записей на слот и дату — для проверки свободных мест */
  async countActiveBookings(kind, scheduleId, lessonDate) {
    const { count, error } = await supabase
      .from(tablesFor(kind).bookings)
      .select('id', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId)
      .eq('lesson_date', lessonDate)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) {
      throw error;
    }

    return count ?? 0;
  },
};
