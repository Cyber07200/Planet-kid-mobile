import { supabase } from '../config/supabase';
import {
  cleanGender,
  cleanName,
  isValidBirthDate,
  isValidName,
} from '../utils/validation';
import {
  SUBSCRIPTION_TYPE_FIELDS,
  USER_FIELDS,
  mapChild,
  mapSubscription,
  mapUser,
} from './mappers';

const CHILD_FIELDS = 'id, parent_id, first_name, last_name, birth_date, gender, created_at';

const SUBSCRIPTION_FIELDS = `
  id,
  user_id,
  subscription_type_id,
  lessons_total,
  lessons_left,
  price_per_lesson,
  teacher_payout_per_lesson,
  end_date,
  is_active,
  created_at,
  subscription_types ( ${SUBSCRIPTION_TYPE_FIELDS} )
`;

/** Поля ребёнка для записи в базу; невалидный ввод не доходит до запроса */
const toChildRow = ({ firstName, lastName, birthDate }) => {
  if (!isValidName(firstName)) {
    throw new Error('Введите имя ребёнка');
  }

  if (!isValidBirthDate(birthDate)) {
    throw new Error('Укажите корректную дату рождения ребёнка');
  }

  return {
    first_name: cleanName(firstName),
    last_name: cleanName(lastName) || null,
    birth_date: birthDate,
  };
};

export const UsersService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select(USER_FIELDS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapUser(data);
  },

  async updateProfile(userId, { firstName, lastName }) {
    if (!isValidName(firstName)) {
      throw new Error('Введите имя');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        first_name: cleanName(firstName),
        last_name: cleanName(lastName) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(USER_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return mapUser(data);
  },

  async getChildren(userId) {
    const { data, error } = await supabase
      .from('children')
      .select(CHILD_FIELDS)
      .eq('parent_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapChild);
  },

  async addChild(userId, child) {
    const { data, error } = await supabase
      .from('children')
      .insert({
        parent_id: userId,
        ...toChildRow(child),
        gender: cleanGender(child.gender),
      })
      .select(CHILD_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return mapChild(data);
  },

  async updateChild(userId, childId, child) {
    const payload = toChildRow(child);

    if (child.gender !== undefined) {
      payload.gender = cleanGender(child.gender);
    }

    const { data, error } = await supabase
      .from('children')
      .update(payload)
      .eq('id', childId)
      .eq('parent_id', userId)
      .select(CHILD_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return mapChild(data);
  },

  /**
   * Удаление ребёнка.
   *
   * На сайте перед удалением проверяется, что у ребёнка
   * нет записей на занятия (ProfilePage.removeChild).
   * Повторяем эту проверку, иначе упрёмся в внешний ключ.
   */
  async deleteChild(userId, childId) {
    const [groupResult, individualResult] = await Promise.all([
      supabase
        .from('group_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', childId)
        .eq('user_id', userId),

      supabase
        .from('individual_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', childId)
        .eq('user_id', userId),
    ]);

    if (groupResult.error) {
      throw groupResult.error;
    }

    if (individualResult.error) {
      throw individualResult.error;
    }

    const total = (groupResult.count ?? 0) + (individualResult.count ?? 0);

    if (total > 0) {
      throw new Error(
        'Нельзя удалить ребёнка, у которого есть записи на занятия. Сначала отмените его записи.',
      );
    }

    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('parent_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Активная подписка пользователя.
   * Запрос идентичен веб-версии (limit 1, сортировка по end_date).
   */
  async getActiveSubscription(userId) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(SUBSCRIPTION_FIELDS)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapSubscription(data);
  },
};
