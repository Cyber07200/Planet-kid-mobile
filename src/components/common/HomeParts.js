import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { NotificationCard, NotificationsEmpty } from './NotificationCard';
import { colors, fs, layout, s, text } from '../../theme';
import { getGreeting } from '../../utils/format';

/**
 * Общие блоки главных экранов родителя и преподавателя.
 */

/* Шапка: приветствие с аватаром (ведёт в профиль) и шестерёнка настроек */
export const HomeHeader = ({
  firstName,
  lastName,
  avatar,
  accentName = false,
  onPressProfile,
  onPressSettings,
}) => (
  <View style={styles.header}>
    <Pressable
      onPress={onPressProfile}
      style={({ pressed }) => [styles.greetingPill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Открыть профиль"
    >
      <Avatar uri={avatar} firstName={firstName} lastName={lastName} size={50} />

      <Text style={styles.greeting} numberOfLines={2}>
        {getGreeting()},{'\n'}
        {/* У родителя имя выделено основным цветом, как в макете */}
        <Text style={accentName ? styles.greetingName : null}>{firstName}</Text>
      </Text>
    </Pressable>

    <Pressable
      onPress={onPressSettings}
      style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Настройки"
    >
      <Icon name="settings" size={fs(32)} color={colors.white} />
    </Pressable>
  </View>
);

/* Самое свежее уведомление и «Посмотреть все» — Frame 23 макета */
export const LatestNotification = ({ notification, onPress }) => {
  /* В макете пустой блок идёт без кнопки «Посмотреть все» */
  if (!notification) {
    return <NotificationsEmpty />;
  }

  return (
    <View style={styles.notifications}>
      <NotificationCard notification={notification} size="large" onPress={onPress} />

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.showAllLabel}>Посмотреть все</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
  },
  greetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.surface,
    borderRadius: s(50),
    padding: s(5),
    paddingRight: s(18),
    flexShrink: 1,
  },
  greeting: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(16),
    lineHeight: fs(16) * 1.35,
    color: colors.text,
    flexShrink: 1,
  },
  greetingName: {
    color: colors.primary,
  },
  settingsButton: {
    width: s(52),
    height: s(52),
    borderRadius: s(26),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifications: {
    gap: s(10),
  },
  showAll: {
    height: s(36),
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAllLabel: {
    ...text.cardTitle,
    color: colors.text70,
  },
  pressed: {
    opacity: 0.85,
  },
});
