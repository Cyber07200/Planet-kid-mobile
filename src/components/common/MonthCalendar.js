import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../ui/Icon';
import { colors, fonts, fs, s, withAlpha } from '../../theme';
import { MONTHS, formatDateKey, parseDateKey } from '../../utils/date';

/**
 * Календарь на месяц — фрейм «Calendar (Calendar fullsize)».
 *
 * Из макета: карточка 460 шириной, фон #F6F6F6, радиус 23,
 * обводка #C3C0C0 на 10%, внутренние отступы 20.
 * Шапка 51 в высоту: круглые кнопки 51x51 по краям,
 * название месяца по центру (Montserrat SemiBold 24, #323232 90%).
 * Таблица: строка дней недели 29 в высоту (17px, #6E94F5),
 * ячейки дат 57x57 с радиусом 11 и зазором 1.
 *
 * Синим залиты дни, на которые есть занятия — так же,
 * как в недельной ленте на том же экране.
 */

/* В макете шапка таблицы начинается с воскресенья, но вся
   остальная разметка (недельная лента 22 Пн … 28 Вс) идёт
   с понедельника — оставляем понедельник, как принято в РФ. */
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const MonthCalendar = ({
  minDate,
  maxDate,
  selectedDateKey,
  eventsByDate,
  onSelect,
  style,
}) => {
  const [cursor, setCursor] = useState(() =>
    startOfMonth((selectedDateKey ? parseDateKey(selectedDateKey) : null) ?? minDate),
  );

  /* Открыли календарь после выбора дня — показываем его месяц */
  useEffect(() => {
    if (!selectedDateKey) {
      return;
    }

    const date = parseDateKey(selectedDateKey);

    if (date) {
      setCursor(startOfMonth(date));
    }
  }, [selectedDateKey]);

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const lastDay = new Date(year, month + 1, 0).getDate();

    const firstWeekDay = new Date(year, month, 1).getDay();

    /* Понедельник — первый столбец */
    const leading = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

    const cells = [];

    for (let index = 0; index < leading; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDay; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const result = [];

    for (let index = 0; index < cells.length; index += 7) {
      result.push(cells.slice(index, index + 7));
    }

    return result;
  }, [cursor]);

  const canGoPrevious = useMemo(
    () => startOfMonth(cursor) > startOfMonth(minDate),
    [cursor, minDate],
  );

  const canGoNext = useMemo(
    () => startOfMonth(cursor) < startOfMonth(maxDate),
    [cursor, maxDate],
  );

  const shiftMonth = (delta) => {
    setCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          disabled={!canGoPrevious}
          style={({ pressed }) => [
            styles.navButton,
            !canGoPrevious ? styles.navDisabled : null,
            pressed && canGoPrevious ? styles.navPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
        >
          <Icon name="chevron-left" size={fs(24)} color={colors.text} />
        </Pressable>

        <Text style={styles.monthLabel}>{MONTHS[cursor.getMonth()]}</Text>

        <Pressable
          onPress={() => shiftMonth(1)}
          disabled={!canGoNext}
          style={({ pressed }) => [
            styles.navButton,
            !canGoNext ? styles.navDisabled : null,
            pressed && canGoNext ? styles.navPressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
        >
          <Icon name="chevron-right" size={fs(24)} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day) => (
          <View key={day} style={styles.weekHeaderCell}>
            <Text style={styles.weekDay}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.body}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.row}>
            {week.map((date, dayIndex) => {
              if (!date) {
                return (
                  <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.cell} />
                );
              }

              const key = formatDateKey(date);

              const inRange = date >= minDate && date <= maxDate;

              const hasEvents = (eventsByDate?.get(key)?.length ?? 0) > 0;

              const isSelected = key === selectedDateKey;

              return (
                <Pressable
                  key={key}
                  onPress={() => inRange && onSelect?.(key)}
                  disabled={!inRange}
                  style={({ pressed }) => [
                    styles.cell,
                    hasEvents && inRange ? styles.cellActive : null,
                    hasEvents && !inRange ? styles.cellActiveMuted : null,
                    isSelected ? styles.cellSelected : null,
                    pressed && inRange ? styles.pressed : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: !inRange }}
                >
                  <Text
                    style={[
                      styles.cellLabel,
                      hasEvents ? styles.cellLabelActive : null,
                      !inRange && !hasEvents ? styles.cellLabelDisabled : null,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: s(23),
    borderWidth: 1,
    borderColor: withAlpha('#C3C0C0', 0.1),
    padding: s(20),
  },
  header: {
    height: s(51),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: s(51),
    height: s(51),
    borderRadius: s(45),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPressed: {
    backgroundColor: colors.text10,
  },
  navDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontFamily: fonts.inputSemibold,
    fontSize: fs(24),
    lineHeight: fs(24) * 1.1,
    color: colors.text90,
    textAlign: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    gap: s(1),
    marginTop: s(22),
  },
  weekHeaderCell: {
    flex: 1,
    height: s(29),
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDay: {
    fontFamily: fonts.inputRegular,
    fontSize: fs(17),
    color: colors.primary,
  },
  body: {
    gap: s(1),
  },
  row: {
    flexDirection: 'row',
    gap: s(1),
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: s(11),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellActive: {
    backgroundColor: colors.primary,
  },
  cellActiveMuted: {
    backgroundColor: colors.primary50,
  },
  cellSelected: {
    borderColor: colors.text,
  },
  cellLabel: {
    fontFamily: fonts.inputRegular,
    fontSize: fs(17),
    color: colors.text,
  },
  cellLabelActive: {
    color: colors.background,
  },
  cellLabelDisabled: {
    color: '#B3B3B3',
  },
  pressed: {
    opacity: 0.7,
  },
});
