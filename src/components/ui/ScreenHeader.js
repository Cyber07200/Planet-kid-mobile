import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';

import { colors, fs, layout, s, text } from '../../theme';

/**
 * Шапка экрана из макета: стрелка «назад» + заголовок,
 * при необходимости — действие справа.
 *
 * В Figma это Frame 28: отступ 20 по бокам, иконка 24,
 * заголовок Comfortaa SemiBold 24.
 */
export const ScreenHeader = ({
  title,
  onBack,
  right = null,
  large = false,
  /* Счётчик рядом с заголовком — например непрочитанные уведомления */
  badge = null,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={s(14)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <Icon name="arrow-left" size={fs(24)} color={colors.text} />
          </Pressable>
        ) : null}

        <Text
          style={large ? styles.titleLarge : styles.title}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Круглый счётчик рядом с заголовком, как на сайте */}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

/**
 * Кнопка-«таблетка» справа в шапке
 * (например «Очистить все» на экране уведомлений).
 */
export const HeaderAction = ({ label, onPress, disabled = false }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        disabled ? styles.actionDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
      accessibilityRole="button"
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: s(40),
    paddingHorizontal: layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flexShrink: 1,
  },
  backButton: {
    width: s(28),
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...text.headerTitle,
    flexShrink: 1,
  },
  titleLarge: {
    ...text.screenTitle,
    flexShrink: 1,
  },
  badge: {
    minWidth: s(24),
    height: s(24),
    borderRadius: s(12),
    paddingHorizontal: s(7),
    backgroundColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(12),
    color: colors.primary,
  },
  right: {
    flexShrink: 0,
  },
  action: {
    height: s(31),
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(14),
    color: colors.white,
  },
  pressed: {
    opacity: 0.8,
  },
});
