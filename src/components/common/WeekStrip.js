import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DayCell } from '../ui/DayChip';
import { layout, s } from '../../theme';
import { DAY_SHORT, addDays, formatDateKey, getIsoDay, getMonday } from '../../utils/date';

/**
 * Лента недели из макета «Calendar» (Frame 5): семь квадратов,
 * синим залиты отмеченные дни, неделя листается свайпом.
 * Недели начинаются с понедельника: 22 Пн … 28 Вс.
 *
 * @param {Function} props.isMarked (dateKey) => есть ли в этот день занятия
 */
export const WeekStrip = ({ minDate, maxDate, selectedDateKey, isMarked, onSelect, style }) => {
  const [width, setWidth] = useState(0);

  const weeks = useMemo(() => {
    const result = [];

    for (let start = getMonday(minDate); start <= maxDate; start = addDays(start, 7)) {
      result.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)));
    }

    return result;
  }, [maxDate, minDate]);

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={[styles.strip, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {weeks.map((week) => (
        <View key={formatDateKey(week[0])} style={[styles.week, width ? { width } : null]}>
          {week.map((date) => {
            const key = formatDateKey(date);

            return (
              <DayCell
                key={key}
                number={date.getDate()}
                name={DAY_SHORT[getIsoDay(date)]}
                hasEvents={isMarked(key)}
                selected={key === selectedDateKey}
                disabled={date < minDate || date > maxDate}
                onPress={() => onSelect(key)}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  /* Frame 5 в макете стоит на 25 ниже заголовка */
  strip: {
    flexGrow: 0,
    marginTop: s(25),
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
  },
});
