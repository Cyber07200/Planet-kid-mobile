import { supabase } from '../config/supabase';
import { logWarn } from '../utils/logger';
import { mapNotification } from './mappers';

/**
 * uuid v4 для нового уведомления.
 *
 * id задаём сами: тогда не нужно перечитывать вставленную строку,
 * а чтение notifications может быть закрыто политикой доступа.
 * Это не секрет, поэтому запасной Math.random допустим.
 */
const createUuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });

const isEnumError = (error) => String(error?.message ?? '').includes('enum');

/**
 * Уведомления: таблицы notifications и user_notifications,
 * в которые пишет и админка сайта.
 */
export const NotificationsService = {
  async getForUser(userId) {
    const { data, error } = await supabase
      .from('user_notifications')
      .select(
        `id, user_id, notification_id, is_read, created_at,
        notifications ( id, title, message, type, target_role, created_at, expires_at )`,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const now = new Date();

    return (data ?? [])
      .map(mapNotification)
      .filter((item) => item && (!item.expiresAt || new Date(item.expiresAt) >= now));
  },

  /*
   * Тип уведомления — enum в базе (notification_type), и набор значений
   * в проектах отличается. Поэтому тип берём из уже существующих
   * уведомлений (их создаёт админка), а если не вышло — вставляем
   * без него, и база подставит значение по умолчанию.
   */
  _knownType: undefined,

  async getKnownNotificationType() {
    if (this._knownType === undefined) {
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .not('type', 'is', null)
        .limit(1)
        .maybeSingle();

      this._knownType = error ? null : data?.type ?? null;
    }

    return this._knownType;
  },

  /**
   * Персональное уведомление — два шага админки сайта:
   * запись в notifications и связь с пользователем в user_notifications.
   *
   * @returns {Promise<string|null>} id уведомления
   */
  async createForUser({ userId, title, message, type = null }) {
    if (!userId || !message) {
      return null;
    }

    const notification = {
      id: createUuid(),
      title: title || 'Уведомление',
      message,
      target_role: 'parent',
    };

    const knownType = type ?? (await this.getKnownNotificationType());

    let { error } = await supabase
      .from('notifications')
      .insert(knownType ? { ...notification, type: knownType } : notification);

    /* База не приняла тип — пишем без него и больше этот тип не пробуем */
    if (error && knownType && isEnumError(error)) {
      logWarn('notifications: тип не подошёл', error);
      this._knownType = null;

      ({ error } = await supabase.from('notifications').insert(notification));
    }

    if (error) {
      throw error;
    }

    const { error: linkError } = await supabase.from('user_notifications').insert({
      user_id: userId,
      notification_id: notification.id,
      is_read: false,
    });

    if (linkError) {
      throw linkError;
    }

    return notification.id;
  },

  /** Отметка о прочтении — только своего уведомления */
  async markAsRead(userNotificationId, userId) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', userNotificationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  },

  /**
   * «Очистить все» из макета: удаляем только связи пользователя,
   * сами уведомления (общий справочник) не трогаем.
   */
  async clearAll(userId) {
    const { error } = await supabase.from('user_notifications').delete().eq('user_id', userId);

    if (error) {
      throw error;
    }
  },
};
