import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';

import { colors, fs, layout, s, text } from '../../theme';

/**
 * Карточка уведомления — Frame 18..22 из макета Notification.
 *
 * Цвет зависит от типа уведомления в базе (notifications.type):
 *   warning / lesson  → #FFB33A @80%
 *   danger  / payment → #FF573A @80%
 *   остальные          → #6E94F5 @80%
 */
const TYPE_STYLES = {
  warning: { background: colors.orange80, icon: 'calendar' },
  lesson: { background: colors.orange80, icon: 'calendar' },
  reminder: { background: colors.orange80, icon: 'bell' },

  danger: { background: colors.redAlert80, icon: 'credit-card' },
  error: { background: colors.redAlert80, icon: 'alert-circle' },
  payment: { background: colors.redAlert80, icon: 'credit-card' },
  subscription: { background: colors.redAlert80, icon: 'credit-card' },

  info: { background: colors.primary80, icon: 'info' },
  success: { background: colors.primary80, icon: 'check-circle' },
};

/** «10:24» из даты создания уведомления */
const formatClock = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

export const NotificationCard = ({
  notification,
  onPress,
  size = 'default',
  /* На главной время не показываем — там только само сообщение */
  showTime = false,
  style,
}) => {
  const config = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;

  const isLarge = size === 'large';

  const timeLabel = formatClock(notification.createdAt);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: config.background },
        pressed && onPress ? styles.pressed : null,
        style,
      ]}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <Icon name={config.icon} size={fs(32)} color={colors.white} />

      <View style={styles.body}>
        {notification.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {notification.title}
          </Text>
        ) : null}

        <Text style={[styles.message, isLarge ? styles.messageLarge : null]}>
          {notification.message}
        </Text>

        {/*
          Время под текстом — так же, как на сайте
          (NotificationsPage.tsx: «10:24» под сообщением).
        */}
        {showTime && timeLabel ? (
          <Text style={styles.time}>{timeLabel}</Text>
        ) : null}
      </View>

      {!notification.isRead ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
};

/**
 * Пустое состояние — Frame 24 из макета Home:
 * двойная галочка и подпись, оба цветом #323232 на 60%.
 * Фона и обводки у блока нет.
 */
export const NotificationsEmpty = ({
  label = 'У вас пока нет уведомлений',
  style,
}) => (
  <View style={[styles.empty, style]}>
    <Icon name="check-all" size={fs(32)} color={colors.text60} />

    <Text style={styles.emptyLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  empty: {
    minHeight: s(98),
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(20),
    gap: s(10),
  },
  emptyLabel: {
    ...text.cardTitle,
    color: colors.text60,
    textAlign: 'center',
  },
  card: {
    borderRadius: layout.radius.md,
    padding: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  body: {
    flex: 1,
    gap: s(4),
  },
  title: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(16),
    color: colors.white,
    lineHeight: fs(16) * 1.25,
  },
  message: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(16),
    color: colors.white,
    lineHeight: fs(16) * 1.3,
  },
  messageLarge: {
    fontSize: fs(20),
    lineHeight: fs(20) * 1.25,
  },
  /* Время создания уведомления */
  time: {
    fontFamily: text.hint.fontFamily,
    fontSize: fs(12),
    color: colors.white70,
    marginTop: s(2),
  },
  unreadDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.9,
  },
});
