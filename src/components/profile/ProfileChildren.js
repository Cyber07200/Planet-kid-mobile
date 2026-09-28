import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChildRow } from '../common/ChildRow';
import { colors, layout, s, text } from '../../theme';
import { calculateAge, formatTime, getRelativeDayLabel } from '../../utils/date';
import { plural } from '../../utils/format';

/**
 * Список детей в профиле: строка ребёнка и раскрывающийся
 * блок с возрастом и ближайшими записями.
 */

const MAX_VISIBLE_BOOKINGS = 6;

const ChildBookings = ({ child, bookings }) => {
  const age = calculateAge(child.birthDate);

  return (
    <View style={styles.bookings}>
      {age !== null ? (
        <Text style={styles.age}>
          {age} {plural(age, 'год', 'года', 'лет')}
        </Text>
      ) : null}

      {bookings.length > 0 ? (
        bookings.slice(0, MAX_VISIBLE_BOOKINGS).map((booking) => (
          <View key={booking.id} style={styles.bookingRow}>
            <Text style={styles.bookingName} numberOfLines={1}>
              {booking.activityName ?? 'Занятие'}
            </Text>

            <Text style={styles.bookingDate}>
              {getRelativeDayLabel(booking.lessonDate)}
              {booking.startTime ? `, ${formatTime(booking.startTime)}` : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Пока нет записей на занятия</Text>
      )}
    </View>
  );
};

export const ProfileChildren = ({
  items,
  bookingsByChild,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
}) => {
  if (items.length === 0) {
    return (
      <Text style={styles.noChildren}>
        Дети пока не добавлены. Добавьте ребёнка, чтобы записываться на занятия.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((child) => (
        <View key={child.id}>
          <ChildRow
            child={child}
            expanded={expandedId === child.id}
            onToggle={() => onToggle(child.id)}
            onEdit={() => onEdit(child)}
            onDelete={() => onDelete(child)}
          />

          {expandedId === child.id ? (
            <ChildBookings child={child} bookings={bookingsByChild[child.id] ?? []} />
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    marginHorizontal: layout.gutter,
    gap: s(10),
  },
  bookings: {
    marginTop: s(8),
    marginLeft: s(62),
    gap: s(8),
  },
  age: {
    ...text.hint,
    color: colors.text60,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.sm,
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    gap: s(10),
  },
  bookingName: {
    ...text.caption,
    color: colors.text80,
    flexShrink: 1,
  },
  bookingDate: {
    ...text.hint,
    color: colors.primary,
  },
  empty: {
    ...text.hint,
    color: colors.text60,
  },
  noChildren: {
    ...text.cardBody,
    marginHorizontal: layout.gutter,
  },
});
