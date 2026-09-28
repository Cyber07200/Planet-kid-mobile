import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, s, text } from '../../theme';

/**
 * Маленький ярлык дня недели в карточке направления:
 * «ПН» на фоне #6E94F5, радиус 5, шрифт Comfortaa Bold 12.
 * Серый вариант «+2» — для скрытых дней.
 */
export const DayBadge = ({ label, muted = false, style }) => (
  <View style={[styles.badge, muted ? styles.badgeMuted : null, style]}>
    <Text style={styles.badgeLabel}>{label}</Text>
  </View>
);

/**
 * Размер ячейки календарной ленты.
 *
 * В макете (Calendar, Frame 5) семь квадратов 57x57 разложены
 * по ширине контента 460 через SPACE_EVENLY — то есть неделя
 * всегда видна целиком, без горизонтальной прокрутки.
 */
export const DAY_CELL_SIZE = s(57);

/**
 * Квадрат дня в календарной ленте.
 *
 * По макету синим залиты дни, на которые есть занятия;
 * выбранный день дополнительно обведён рамкой,
 * прошедшие дни приглушены.
 */
export const DayCell = ({
  number,
  name,
  hasEvents = false,
  selected = false,
  disabled = false,
  onPress,
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.cell,
      hasEvents ? styles.cellFilled : null,
      selected ? styles.cellSelected : null,
      disabled ? styles.cellDisabled : null,
      pressed && !disabled ? styles.pressed : null,
      style,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected, disabled }}
    accessibilityLabel={`${number} ${name}${hasEvents ? ', есть занятия' : ''}`}
  >
    <Text style={[styles.cellNumber, hasEvents ? styles.cellTextFilled : null]}>
      {number}
    </Text>

    <Text style={[styles.cellName, hasEvents ? styles.cellNameFilled : null]}>
      {name}
    </Text>
  </Pressable>
);

/**
 * Квадрат расписания в модалке направления:
 * сверху день недели, снизу время.
 */
export const SchedulePill = ({ day, time, active = true, onPress, style }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [
      styles.cell,
      active ? styles.cellFilled : styles.cellInactive,
      pressed && onPress ? styles.pressed : null,
      style,
    ]}
    accessibilityRole={onPress ? 'button' : 'none'}
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.cellNumber, active ? styles.cellTextFilled : null]}>
      {day}
    </Text>

    <Text style={[styles.cellName, active ? styles.cellNameFilled : null]}>
      {time}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  badge: {
    minWidth: s(27),
    height: s(19),
    borderRadius: layout.radius.xs,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(5),
  },
  badgeMuted: {
    backgroundColor: colors.text40,
  },
  badgeLabel: {
    ...text.dayChip,
  },
  cell: {
    width: DAY_CELL_SIZE,
    height: DAY_CELL_SIZE,
    borderRadius: layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(2),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellFilled: {
    backgroundColor: colors.primary,
  },
  cellInactive: {
    backgroundColor: colors.text10,
  },
  cellSelected: {
    borderColor: colors.text,
  },
  cellDisabled: {
    opacity: 0.35,
  },
  cellNumber: {
    ...text.dayNumber,
    color: colors.text,
  },
  cellTextFilled: {
    color: colors.background,
  },
  cellName: {
    ...text.dayName,
    color: colors.text80,
  },
  cellNameFilled: {
    color: 'rgba(250, 250, 250, 0.8)',
  },
  pressed: {
    opacity: 0.85,
  },
});
