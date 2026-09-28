import { supabase } from '../config/supabase';

/**
 * Подписки.
 *
 * Расчёт цены — это ровно та же формула, что в SubscribePage.tsx:
 * базовая цена берётся из subscription_types.base_price_per_lesson,
 * скидка растёт линейно до 15% при выборе максимума занятий,
 * итог округляется до 5 рублей.
 */

export const getDiscountPercent = (lessonsCount, minLessons, maxLessons) => {
  if (maxLessons <= minLessons) {
    return 0;
  }

  const progress = (lessonsCount - minLessons) / (maxLessons - minLessons);

  const discount = progress * 15;

  return Math.min(Math.max(discount, 0), 15);
};

export const getCalculatedPrice = (basePrice, lessonsCount, minLessons, maxLessons) => {
  const discountPercent = getDiscountPercent(lessonsCount, minLessons, maxLessons);

  const price = basePrice * (1 - discountPercent / 100);

  return Math.round(price / 5) * 5;
};

export const getTotalPrice = (plan, lessonsCount) => {
  if (!plan || lessonsCount <= 0) {
    return 0;
  }

  const pricePerLesson = getCalculatedPrice(
    plan.basePricePerLesson,
    lessonsCount,
    plan.minLessons,
    plan.maxLessons,
  );

  return pricePerLesson * lessonsCount;
};

/**
 * Преимущества тарифа.
 * Тексты и пороги — из getPlanBenefits в SubscribePage.tsx.
 */
export const getPlanBenefits = (plan) => {
  if (!plan) {
    return [];
  }

  const benefits = [`${plan.minLessons}-${plan.maxLessons} занятий`];

  if (plan.levelValue <= 1) {
    benefits.push('3 базовых направления');
    benefits.push('Ежемесячный бонус +5 баллов');
  } else if (plan.levelValue === 2) {
    benefits.push('Большая часть направлений');
    benefits.push('Ежемесячный бонус +15 баллов');
  } else {
    benefits.push('Доступны все направления');
    benefits.push('Ежемесячный бонус +30 баллов');
  }

  if (plan.isIndividual) {
    benefits.push('Индивидуальные занятия');
  }

  return benefits;
};

/**
 * Изменение остатка занятий: прочитать → посчитать → записать.
 *
 * Атомарного обновления без серверной функции PostgREST не даёт,
 * поэтому одновременная запись с двух устройств может потерять
 * одно списание — см. рекомендацию в supabase/README.md.
 */
const adjustLessonsLeft = async (subscriptionId, userId, compute) => {
  const { data: current, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('id, lessons_left, lessons_total')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!current) {
    return null;
  }

  const lessonsLeft = compute(
    Number(current.lessons_left ?? 0),
    Number(current.lessons_total ?? 0),
  );

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ lessons_left: lessonsLeft })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return lessonsLeft;
};

export const SubscriptionsService = {
  /** Списание занятий с подписки; возвращает новый остаток */
  decreaseLessons(subscriptionId, userId, lessonsUsed) {
    return adjustLessonsLeft(subscriptionId, userId, (left) => Math.max(left - lessonsUsed, 0));
  },

  /** Возврат занятия на баланс при отмене записи, не выше lessons_total */
  increaseLessons(subscriptionId, userId, lessonsReturned = 1) {
    return adjustLessonsLeft(subscriptionId, userId, (left, total) =>
      Math.min(left + lessonsReturned, total || Number.MAX_SAFE_INTEGER),
    );
  },

  /**
   * Перепроверка подписки прямо перед записью.
   *
   * На сайте это делается, чтобы не записаться по устаревшим
   * данным, если занятия закончились в другой вкладке.
   */
  async getFreshSubscription(subscriptionId, userId) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('id, lessons_left, lessons_total, end_date, is_active')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      lessonsLeft: Number(data.lessons_left ?? 0),
      lessonsTotal: Number(data.lessons_total ?? 0),
      endDate: data.end_date,
      isActive: Boolean(data.is_active),
    };
  },
};
