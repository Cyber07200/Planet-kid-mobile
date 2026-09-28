import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { colors, fs, layout, s, text } from '../../theme';
import { formatTime } from '../../utils/date';
import {
  extractAgeLabel,
  formatMoney,
  plural,
  stripAgeLabel,
} from '../../utils/format';

/**
 * Карточка занятия — Frame 8/9 из макета Calendar,
 * наполнение повторяет карточку записи с сайта
 * (CalendarPage.tsx, renderEventCard):
 *
 *   метки «Индивидуальное» / «Отменено»
 *   название + возраст
 *   плашка «Записан» с галочкой, если ребёнок записан
 *   время занятия с иконкой часов и длительностью
 *   преподаватель и количество свободных мест
 *   нижняя полоса «Записан: Миша» / «Занятие отменено» / «Все места заняты»
 *
 * Свободные места на сайте подсвечены цветом: нет мест — красный,
 * два и меньше — оранжевый, иначе зелёный. Здесь так же.
 */
export const LessonCard = ({ event, onPress, style }) => {
  const ageLabel = extractAgeLabel(event.name);
  const title = stripAgeLabel(event.name) || event.name;

  const bookedChildren = event.bookedChildren ?? [];
  const isBooked = bookedChildren.length > 0;

  const isFull = !event.cancelled && !isBooked && event.spotsLeft <= 0;

  /* Цвет счётчика мест — как на сайте */
  const spotsColor = isFull
    ? colors.redAlert
    : event.spotsLeft <= 2
      ? colors.orangeDeep
      : colors.green;

  /* Нижняя полоса карточки: статус записи или причина недоступности */
  const renderStrip = () => {
    if (event.cancelled) {
      return (
        <View style={[styles.strip, styles.stripDanger]}>
          <Icon name="alert-circle" size={fs(14)} color={colors.redAlert} />

          <Text style={styles.stripDangerLabel} numberOfLines={1}>
            {event.cancellationReason
              ? `Занятие отменено: ${event.cancellationReason}`
              : 'Занятие отменено'}
          </Text>
        </View>
      );
    }

    if (isBooked) {
      return (
        <View style={[styles.strip, styles.stripPrimary]}>
          <Icon name="check" size={fs(14)} color={colors.primary} />

          <Text style={styles.stripPrimaryLabel} numberOfLines={1}>
            {bookedChildren.length === 1
              ? `Записан: ${bookedChildren[0].firstName}`
              : `Записаны: ${bookedChildren.length} ${plural(
                  bookedChildren.length,
                  'ребёнок',
                  'ребёнка',
                  'детей',
                )}`}
          </Text>
        </View>
      );
    }

    if (isFull) {
      return (
        <View style={[styles.strip, styles.stripDanger]}>
          <Text style={styles.stripDangerLabel}>Все места заняты</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Card
      onPress={onPress}
      selected={isBooked && !event.cancelled}
      style={[styles.card, event.cancelled ? styles.cardCancelled : null, style]}
    >
      {/* Метки типа занятия — как на сайте */}
      {event.type === 'individual' || event.cancelled ? (
        <View style={styles.badges}>
          {event.type === 'individual' ? (
            <Text style={[styles.badge, styles.badgePurple]}>Индивидуальное</Text>
          ) : null}

          {event.cancelled ? (
            <Text style={[styles.badge, styles.badgeRed]}>Отменено</Text>
          ) : null}
        </View>
      ) : null}

      {/* Название, возраст и отметка о записи */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {ageLabel ? <Text style={styles.age}>{ageLabel}</Text> : null}
        </View>

        {isBooked && !event.cancelled ? (
          <View style={styles.bookedPill}>
            <Icon name="check" size={fs(12)} color={colors.primary} />

            <Text style={styles.bookedPillLabel}>Записан</Text>
          </View>
        ) : null}
      </View>

      {/* Время занятия и длительность */}
      <View style={styles.timeRow}>
        <View style={styles.clockChip}>
          <Icon name="clock" size={fs(16)} color={colors.primary} />
        </View>

        <View style={styles.timeBody}>
          <Text style={styles.time}>
            {formatTime(event.time)}
            {event.endTime ? `–${formatTime(event.endTime)}` : ''}
          </Text>

          {event.duration ? (
            <Text style={styles.duration}>{event.duration} мин.</Text>
          ) : null}
        </View>
      </View>

      {/* Преподаватель и свободные места */}
      <View style={styles.footer}>
        <View style={styles.teacherRow}>
          <Icon name="users" size={fs(14)} color={colors.text60} />

          <Text style={styles.teacher} numberOfLines={1}>
            {event.teacher || 'Преподаватель'}
          </Text>
        </View>

        {!event.cancelled && !isBooked ? (
          <Text style={[styles.spots, { color: spotsColor }]}>
            {isFull
              ? 'Нет мест'
              : `${event.spotsLeft} ${plural(
                  event.spotsLeft,
                  'место',
                  'места',
                  'мест',
                )}`}
          </Text>
        ) : null}
      </View>

      {/* Стоимость занятия — важна для разовой записи */}
      {Number(event.pricePerLesson) > 0 && !event.cancelled ? (
        <View style={styles.priceRow}>
          <Icon name="credit-card" size={fs(14)} color={colors.text60} />

          <Text style={styles.price}>
            {formatMoney(event.pricePerLesson)} за занятие
          </Text>
        </View>
      ) : null}

      {renderStrip()}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: s(12),
  },
  cardCancelled: {
    opacity: 0.7,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
  },
  badge: {
    ...text.hint,
    borderRadius: layout.radius.pill,
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    overflow: 'hidden',
  },
  badgePurple: {
    color: colors.purple,
    backgroundColor: 'rgba(129, 102, 228, 0.12)',
  },
  badgeRed: {
    color: colors.redAlert,
    backgroundColor: 'rgba(255, 87, 58, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    flexShrink: 1,
  },
  title: {
    ...text.cardTitle,
    flexShrink: 1,
  },
  age: {
    ...text.cardTitle,
    color: colors.primary,
  },
  /* Плашка «Записан» справа от названия */
  bookedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.pill,
    paddingHorizontal: s(8),
    paddingVertical: s(4),
    flexShrink: 0,
  },
  bookedPillLabel: {
    ...text.hint,
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  /* Квадрат с часами — как на карточке сайта */
  clockChip: {
    width: s(36),
    height: s(36),
    borderRadius: layout.radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBody: {
    flexShrink: 1,
  },
  time: {
    ...text.caption,
    color: colors.text,
  },
  duration: {
    ...text.hint,
    color: colors.text60,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    flexShrink: 1,
  },
  teacher: {
    ...text.hint,
    color: colors.text60,
    flexShrink: 1,
  },
  spots: {
    ...text.hint,
    flexShrink: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  price: {
    ...text.hint,
    color: colors.text60,
  },
  /* Нижняя полоса статуса */
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    borderRadius: layout.radius.sm,
    paddingHorizontal: s(10),
    paddingVertical: s(8),
  },
  stripPrimary: {
    backgroundColor: colors.primary10,
  },
  stripPrimaryLabel: {
    ...text.hint,
    color: colors.primary,
    flexShrink: 1,
  },
  stripDanger: {
    backgroundColor: 'rgba(255, 87, 58, 0.08)',
  },
  stripDangerLabel: {
    ...text.hint,
    color: colors.redAlert,
    flexShrink: 1,
  },
});
