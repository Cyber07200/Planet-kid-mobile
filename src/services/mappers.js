import { normalizeRelation } from '../utils/format';

/**
 * Приведение «сырых» строк из Supabase к внутренним моделям приложения.
 *
 * Держим это отдельно, чтобы экраны не знали про snake_case
 * и структуру join'ов PostgREST. Здесь же — наборы полей,
 * которые запрашивают несколько сервисов.
 */

export const USER_FIELDS =
  'id, phone, first_name, last_name, avatar, bonus_points, is_phone_verified, is_active, role';

export const SUBSCRIPTION_TYPE_FIELDS =
  'id, name, level_value, is_individual, min_lessons, max_lessons, base_price_per_lesson, max_price_per_lesson, teacher_payout_per_lesson, is_active';

export const mapUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar ?? null,
    bonusPoints: row.bonus_points ?? 0,
    isPhoneVerified: Boolean(row.is_phone_verified),
    isActive: row.is_active !== false,
    role: row.role || 'parent',
  };
};

export const mapChild = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    parentId: row.parent_id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    gender: row.gender,
    createdAt: row.created_at,
  };
};

export const mapSubscriptionType = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    levelValue: Number(row.level_value ?? 0),
    isIndividual: Boolean(row.is_individual),
    minLessons: Number(row.min_lessons ?? 0),
    maxLessons: Number(row.max_lessons ?? 0),
    basePricePerLesson: Number(row.base_price_per_lesson ?? 0),
    maxPricePerLesson: Number(row.max_price_per_lesson ?? 0),
    teacherPayoutPerLesson: Number(row.teacher_payout_per_lesson ?? 0),
    isActive: row.is_active !== false,
  };
};

export const mapSubscription = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    subscriptionTypeId: row.subscription_type_id,
    lessonsTotal: Number(row.lessons_total ?? 0),
    lessonsLeft: Number(row.lessons_left ?? 0),
    pricePerLesson: Number(row.price_per_lesson ?? 0),
    teacherPayoutPerLesson: Number(row.teacher_payout_per_lesson ?? 0),
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    type: mapSubscriptionType(normalizeRelation(row.subscription_types)),
  };
};

export const mapActivityType = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    teacherId: row.teacher_id,
    durationMinutes: Number(row.duration_minutes ?? 0),
    maxPlaces: Number(row.max_places ?? 0),
    image: row.image,
    isActive: row.is_active !== false,
    subscriptionTypeId: row.subscription_type_id,
    subscriptionType: mapSubscriptionType(normalizeRelation(row.subscription_types)),
  };
};

export const mapTeacher = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar ?? null,
  };
};

export const mapGroupSchedule = (row) => {
  if (!row) {
    return null;
  }

  const activity = normalizeRelation(row.activity_types);

  return {
    id: row.id,
    kind: 'group',
    activityTypeId: row.activity_type_id,
    teacherId: row.teacher_id,
    dayOfWeek: Number(row.day_of_week),
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    activity: mapActivityType(activity),
    teacher: mapTeacher(normalizeRelation(row.teacher)),
  };
};

export const mapIndividualActivity = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    activityTypeId: row.activity_type_id,
    teacherId: row.teacher_id,
    pricePerLesson: Number(row.price_per_lesson ?? 0),
    teacherPayoutPerLesson: Number(row.teacher_payout_per_lesson ?? 0),
    durationMinutes: Number(row.duration_minutes ?? 0),
    isActive: row.is_active !== false,
    activity: mapActivityType(normalizeRelation(row.activity_types)),
  };
};

export const mapIndividualSchedule = (row) => {
  if (!row) {
    return null;
  }

  const individualActivity = normalizeRelation(row.individual_activities);

  return {
    id: row.id,
    kind: 'individual',
    individualActivityId: row.individual_activity_id,
    teacherId: row.teacher_id,
    dayOfWeek: Number(row.day_of_week),
    startTime: row.start_time,
    endTime: row.end_time,
    isBooked: Boolean(row.is_booked),
    status: row.status,
    individualActivity: mapIndividualActivity(individualActivity),
    teacher: mapTeacher(normalizeRelation(row.teacher)),
  };
};

export const mapBooking = (row, kind) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    kind,
    scheduleId: row.schedule_id,
    childId: row.child_id,
    userId: row.user_id,
    subscriptionId: row.subscription_id,
    status: row.status,
    teacherPayout: Number(row.teacher_payout ?? 0),
    lessonDate: row.lesson_date,
    createdAt: row.created_at,
  };
};

export const mapCancellation = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    scheduleId: row.schedule_id,
    lessonDate: row.lesson_date,
    reason: row.reason,
  };
};

export const mapNotification = (row) => {
  if (!row) {
    return null;
  }

  const notification = normalizeRelation(row.notifications) ?? row;

  return {
    id: row.id,
    notificationId: row.notification_id ?? notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'info',
    targetRole: notification.target_role,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || notification.created_at,
    expiresAt: notification.expires_at,
  };
};

export const mapPayout = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
};
