import { supabase } from '../config/supabase';
import {
  SUBSCRIPTION_TYPE_FIELDS,
  mapActivityType,
  mapGroupSchedule,
  mapIndividualSchedule,
  mapSubscriptionType,
} from './mappers';

const ACTIVITY_FIELDS = `
  id,
  name,
  description,
  teacher_id,
  duration_minutes,
  max_places,
  image,
  is_active,
  subscription_type_id,
  subscription_types ( ${SUBSCRIPTION_TYPE_FIELDS} )
`;

/**
 * Каталог: направления, расписания, тарифы, преподаватели.
 */
export const CatalogService = {
  /** Направления = activity_types (так же, как на сайте) */
  async getDirections() {
    const { data, error } = await supabase
      .from('activity_types')
      .select(ACTIVITY_FIELDS)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapActivityType);
  },

  /**
   * Направления вместе с расписанием.
   *
   * Один и тот же список нужен и на «Направлениях», и на главной
   * в «Специальных предложениях», поэтому сборка живёт здесь,
   * а не дублируется на экранах.
   *
   * У направления может не быть ни одного слота — такое направление
   * всё равно возвращается, просто с пустым schedules.
   */
  async getDirectionsWithSchedules() {
    const [directions, groupSchedules, individualSchedules] = await Promise.all([
      this.getDirections(),
      this.getGroupSchedules(),
      this.getIndividualSchedules(),
    ]);

    return directions.map((direction) => {
      /* Групповые слоты этого направления */
      const group = groupSchedules
        .filter((item) => item.activityTypeId === direction.id)
        .map((item) => ({
          id: item.id,
          kind: 'group',
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          teacher: item.teacher,
          maxPlaces: direction.maxPlaces,
          /*
           * Цена одного занятия — нужна для разовой записи.
           * У группового направления она задана тарифом.
           */
          pricePerLesson: Number(
            direction.subscriptionType?.basePricePerLesson ?? 0,
          ),
        }));

      /* Индивидуальные слоты: всегда на одного ребёнка */
      const individual = individualSchedules
        .filter(
          (item) => item.individualActivity?.activityTypeId === direction.id,
        )
        .map((item) => ({
          id: item.id,
          kind: 'individual',
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          teacher: item.teacher,
          maxPlaces: 1,
          isBooked: item.isBooked,
          /* У индивидуального занятия цена своя */
          pricePerLesson: Number(
            item.individualActivity?.pricePerLesson ?? 0,
          ),
        }));

      /* Сортировка: по дню недели, внутри дня — по времени */
      const schedules = [...group, ...individual].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }

        return String(a.startTime).localeCompare(String(b.startTime));
      });

      return { ...direction, schedules };
    });
  },

  async getSubscriptionTypes() {
    const { data, error } = await supabase
      .from('subscription_types')
      .select(SUBSCRIPTION_TYPE_FIELDS)
      .order('level_value', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSubscriptionType);
  },

  /**
   * Групповые расписания.
   *
   * teacher:users!group_schedules_teacher_id_fkey — тот же alias,
   * что и в CalendarPage.tsx: без явного имени внешнего ключа
   * PostgREST не может выбрать связь с users.
   */
  async getGroupSchedules() {
    const { data, error } = await supabase
      .from('group_schedules')
      .select(
        `
        id,
        activity_type_id,
        teacher_id,
        start_time,
        end_time,
        status,
        day_of_week,
        activity_types (${ACTIVITY_FIELDS}),
        teacher:users!group_schedules_teacher_id_fkey (
          id,
          first_name,
          last_name,
          avatar
        )
      `,
      )
      .eq('status', 'scheduled');

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapGroupSchedule);
  },

  async getIndividualSchedules() {
    const { data, error } = await supabase
      .from('individual_schedules')
      .select(
        `
        id,
        individual_activity_id,
        teacher_id,
        start_time,
        end_time,
        is_booked,
        status,
        day_of_week,
        individual_activities (
          id,
          activity_type_id,
          teacher_id,
          price_per_lesson,
          teacher_payout_per_lesson,
          duration_minutes,
          is_active,
          activity_types (${ACTIVITY_FIELDS})
        ),
        teacher:users!individual_schedules_teacher_id_fkey (
          id,
          first_name,
          last_name,
          avatar
        )
      `,
      )
      .eq('status', 'scheduled');

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapIndividualSchedule);
  },


};
