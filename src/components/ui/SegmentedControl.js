import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, s, text } from '../../theme';

/**
 * Переключатель из двух вариантов — макет «Пол: Мальчик / Девочка».
 *
 * Активный:   фон #6E94F5 @20%, текст #6E94F5 @60%
 * Неактивный: фон #323232 @10%, текст #323232 @40%
 */
export const SegmentedControl = ({ options, value, onChange, style }) => (
  <View style={[styles.container, style]}>
    {options.map((option) => {
      const isActive = option.value === value;

      return (
        <Pressable
          key={String(option.value)}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            styles.segment,
            isActive ? styles.segmentActive : styles.segmentInactive,
            pressed ? styles.pressed : null,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text
            style={[
              styles.label,
              isActive ? styles.labelActive : styles.labelInactive,
            ]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: s(20),
  },
  segment: {
    flex: 1,
    height: layout.input,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(12),
  },
  segmentActive: {
    backgroundColor: colors.primary20,
  },
  segmentInactive: {
    backgroundColor: colors.text10,
  },
  label: {
    ...text.input,
  },
  labelActive: {
    color: colors.primary60,
  },
  labelInactive: {
    color: colors.text40,
  },
  pressed: {
    opacity: 0.85,
  },
});
