import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, s } from '../../theme';

/**
 * Карточка из макета: фон #F6F6F6, радиус 20, внутренний отступ 20.
 * selected — состояние «Вы записаны» (обводка основным цветом).
 */
export const Card = ({
  children,
  onPress,
  selected = false,
  disabled = false,
  style,
  padded = true,
}) => {
  const content = (
    <View
      style={[
        styles.card,
        padded ? styles.padded : null,
        selected ? styles.selected : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  padded: {
    padding: s(20),
  },
  selected: {
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
});
