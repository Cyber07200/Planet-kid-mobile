import { supabase } from '../config/supabase';
import { getMonthStartKey, getTodayKey } from '../utils/date';
import { getFullName, normalizeRelation } from '../utils/format';
import { logWarn } from '../utils/logger';
import { ACTIVE_BOOKING_STATUSES, isCancelledStatus } from '../utils/status';
import { mapPayout } from './mappers';

/**
 * Данные преподавательского кабинета.
 *
 * Перенос с сайта (src/components/teacher/*) плюс статистика
 * из Figma-макета учительской главной.
 */

const BOOKING_TABLE = { group: 'group_bookings', individual: 'individual_bookings' };

const ACTIVITY_FIELDS = 'activity_types ( id, name, max_places, duration_minutes, image )';

const NO_ROWS = Promise.resolve({ data: [], error: null });

const rowsOrThrow = ({ data, error }) => {
  if (error) {
    throw error;
  }

  return data ?? [];
};

/** Число записей по датам для одного слота: { '2026-09-20': 3 } */
const countByDate = (bookings, scheduleId) => {
  const result = {};

  bookings.forEach((booking) => {
    if (booking.schedule_id === scheduleId && !isCancelledStatus(booking.status)) {
      result[booking.lesson_date] = (result[booking.lesson_date] ?? 0) + 1;
    }
  });

  return result;
};

const toLesson = ({ row, kind, activity, fallbackName, maxPlaces, bookings }) => {
  const bookingsByDate = countByDate(bookings, row.id);

  return {
    id: row.id,
    kind,
    name: activity?.name ?? fallbackName,
    image: activity?.image ?? null,
    startTime: row.start_time,
    endTime: row.end_time,
    dayOfWeek: Number(row.day_of_week),
    durationMinutes: Number(activity?.duration_minutes ?? 0),
    participants: Object.values(bookingsByDate).reduce((sum, value) => sum + value, 0),
    bookingsByDate,
    maxPlaces,
  };
};

/** Первый день прошлого месяца, YYYY-MM-01 */
const getPreviousMonthStartKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1, 1);

  return getMonthStartKey(date);
};

/** Справочник id → строка; ошибка не критична — список покажется без имён */
const loadLookup = async (table, fields, ids, label) => {
  const unique = [...new Set(ids.filter(Boolean))];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from(table).select(fields).in('id', unique);

  if (error) {
    logWarn(`teacher: ${label}`, error);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
};

export const TeacherService = {
  async getProfile(teacherId) {
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('id, teacher_id, balance, payout_day_1, payout_day_2, created_at')
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return { balance: 0, payoutDay1: null, payoutDay2: null };
    }

    return {
      id: data.id,
      teacherId: data.teacher_id,
      balance: Number(data.balance ?? 0),
      payoutDay1: data.payout_day_1,
      payoutDay2: data.payout_day_2,
    };
  },

  /**
   * Расписание преподавателя: групповые + индивидуальные слоты
   * с числом записанных детей, в том числе по датам —
   * bookingsByDate['2026-09-20'] = 3. Родитель записывается
   * на конкретную дату, поэтому важно число именно на выбранный день.
   *
   * @param {object} [range] диапазон дат записей: { fromDate, toDate }
   */
  async getSchedule(teacherId, range = null) {
    const [groupResult, individualResult] = await Promise.all([
      supabase
        .from('group_schedules')
        .select(`id, start_time, end_time, day_of_week, status, activity_type_id, ${ACTIVITY_FIELDS}`)
        .eq('teacher_id', teacherId)
        .eq('status', 'scheduled'),

      supabase
        .from('individual_schedules')
        .select(
          `id, start_time, end_time, day_of_week, status, is_booked, individual_activity_id,
          individual_activities ( id, activity_type_id, ${ACTIVITY_FIELDS} )`,
        )
        .eq('teacher_id', teacherId)
        .eq('status', 'scheduled'),
    ]);

    const groupSchedules = rowsOrThrow(groupResult);
    const individualSchedules = rowsOrThrow(individualResult);

    /* Без диапазона пришлось бы тянуть всю историю записей */
    const selectBookings = (kind, scheduleIds) => {
      if (scheduleIds.length === 0) {
        return NO_ROWS;
      }

      let query = supabase
        .from(BOOKING_TABLE[kind])
        .select('id, schedule_id, status, lesson_date, child_id')
        .in('schedule_id', scheduleIds);

      if (range?.fromDate && range?.toDate) {
        query = query.gte('lesson_date', range.fromDate).lte('lesson_date', range.toDate);
      }

      return query;
    };

    const [groupBookings, individualBookings] = (
      await Promise.all([
        selectBookings('group', groupSchedules.map((item) => item.id)),
        selectBookings('individual', individualSchedules.map((item) => item.id)),
      ])
    ).map(rowsOrThrow);

    const groups = groupSchedules.map((row) => {
      const activity = normalizeRelation(row.activity_types);

      return toLesson({
        row,
        kind: 'group',
        activity,
        fallbackName: 'Занятие',
        maxPlaces: Number(activity?.max_places ?? 0),
        bookings: groupBookings,
      });
    });

    const individuals = individualSchedules.map((row) =>
      toLesson({
        row,
        kind: 'individual',
        activity: normalizeRelation(normalizeRelation(row.individual_activities)?.activity_types),
        fallbackName: 'Индивидуальное занятие',
        maxPlaces: 1,
        bookings: individualBookings,
      }),
    );

    return [...groups, ...individuals].sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek || String(a.startTime).localeCompare(String(b.startTime)),
    );
  },

  async getPayouts(teacherId) {
    const { data, error } = await supabase
      .from('teacher_payouts')
      .select('id, amount, status, created_at, paid_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPayout);
  },

  /**
   * Статистика для главной преподавателя (из макета):
   * занятий за прошлый месяц и средняя заполняемость групп.
   */
  async getStats(teacherId, schedule) {
    const scheduleList = schedule ?? (await TeacherService.getSchedule(teacherId));

    const idsOf = (kind) =>
      scheduleList.filter((item) => item.kind === kind).map((item) => item.id);

    const monthStart = getMonthStartKey();
    const previousMonthStart = getPreviousMonthStartKey();

    const countLastMonth = async (kind) => {
      const ids = idsOf(kind);

      if (ids.length === 0) {
        return 0;
      }

      const { count, error } = await supabase
        .from(BOOKING_TABLE[kind])
        .select('id', { count: 'exact', head: true })
        .in('schedule_id', ids)
        .gte('lesson_date', previousMonthStart)
        .lt('lesson_date', monthStart)
        .in('status', ACTIVE_BOOKING_STATUSES);

      if (error) {
        throw error;
      }

      return count ?? 0;
    };

    const [groupCount, individualCount] = await Promise.all([
      countLastMonth('group'),
      countLastMonth('individual'),
    ]);

    const groupItems = scheduleList.filter((item) => item.kind === 'group' && item.maxPlaces > 0);

    const occupancy =
      groupItems.length > 0
        ? Math.round(
            (groupItems.reduce(
              (sum, item) => sum + Math.min(item.participants / item.maxPlaces, 1),
              0,
            ) /
              groupItems.length) *
              100,
          )
        : 0;

    return {
      lessonsLastMonth: groupCount + individualCount,
      occupancy,
      todayKey: getTodayKey(),
    };
  },

  /**
   * Дети, записанные на конкретный слот и дату.
   *
   * Цепочка как в базе сайта: занятие → записи → ребёнок → родитель.
   * Каждый шаг — отдельный простой запрос: недоступная связь
   * (политика или иное имя ключа) не ломает весь список.
   */
  async getScheduleParticipants(scheduleId, kind, lessonDate) {
    let query = supabase
      .from(BOOKING_TABLE[kind] ?? BOOKING_TABLE.individual)
      .select('id, status, lesson_date, child_id, user_id, subscription_id')
      .eq('schedule_id', scheduleId);

    if (lessonDate) {
      query = query.eq('lesson_date', lessonDate);
    }

    const rows = rowsOrThrow(await query).filter((row) => !isCancelledStatus(row.status));

    if (rows.length === 0) {
      return [];
    }

    const [children, parents] = await Promise.all([
      loadLookup(
        'children',
        'id, first_name, last_name, birth_date',
        rows.map((row) => row.child_id),
        'дети',
      ),
      loadLookup(
        'users',
        'id, first_name, last_name, phone',
        rows.map((row) => row.user_id),
        'родители',
      ),
    ]);

    return rows.map((row) => {
      const child = children.get(row.child_id);
      const parent = parents.get(row.user_id);

      return {
        bookingId: row.id,
        lessonDate: row.lesson_date,
        childId: row.child_id,
        firstName: child?.first_name ?? 'Ребёнок',
        lastName: child?.last_name ?? null,
        birthDate: child?.birth_date ?? null,
        /* Кто записал ребёнка */
        parentId: row.user_id ?? null,
        parentName: parent ? getFullName(parent.first_name, parent.last_name) : null,
        parentPhone: parent?.phone ?? null,
        /* Разовая запись — без подписки */
        isOneOff: !row.subscription_id,
      };
    });
  },
};
