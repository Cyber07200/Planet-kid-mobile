import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card } from '../ui/Card';
import { DayBadge } from '../ui/DayChip';
import { colors, layout, s, text } from '../../theme';
import { DAY_UPPER } from '../../utils/date';
import { extractAgeLabel, formatMoney, stripAgeLabel } from '../../utils/format';

/**
 * Карточка направления — Frame 9 из макета Directions.
 *
 * Слева название и возраст, справа до двух дней недели
 * и «+N» для остальных, снизу — описание в две строки.
 */
export const DirectionCard = ({ direction, onPress, style }) => {
  const ageLabel = extractAgeLabel(direction.name);
  const title = stripAgeLabel(direction.name) || direction.name;

  const days = [
    ...new Set((direction.schedules ?? []).map((item) => item.dayOfWeek)),
  ].sort((a, b) => a - b);

  const visibleDays = days.slice(0, 2);

  /* Цена занятия: у слотов она уже посчитана в CatalogService */
  const price = Number(
    direction.schedules?.[0]?.pricePerLesson ??
      direction.subscriptionType?.basePricePerLesson ??
      0,
  );
  const hiddenCount = days.length - visibleDays.length;

  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      {/* Изображение направления, если оно загружено в базу */}
      {direction.image ? (
        <Image
          source={{ uri: direction.image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {ageLabel ? <Text style={styles.age}>{ageLabel}</Text> : null}
        </View>

        {days.length > 0 ? (
          <View style={styles.days}>
            {visibleDays.map((day) => (
              <DayBadge key={day} label={DAY_UPPER[day]} />
            ))}

            {hiddenCount > 0 ? (
              <DayBadge label={`+${hiddenCount}`} muted />
            ) : null}
          </View>
        ) : (
          <Text style={styles.noSchedule}>Нет расписания</Text>
        )}
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {direction.description || 'Описание направления пока не добавлено.'}
      </Text>

      {/* Нижняя строка: тариф и стоимость занятия — как на сайте */}
      {direction.subscriptionType?.name || price > 0 ? (
        <View style={styles.meta}>
          {direction.subscriptionType?.name ? (
            <Text style={styles.metaPlan} numberOfLines={1}>
              {direction.subscriptionType.name}
            </Text>
          ) : null}

          {price > 0 ? (
            <Text style={styles.metaPrice}>{formatMoney(price)} / занятие</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: s(20),
  },
  /* Превью направления — как на карточках сайта */
  image: {
    width: '100%',
    height: s(140),
    borderRadius: layout.radius.sm,
    backgroundColor: colors.background,
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
  days: {
    flexDirection: 'row',
    gap: s(5),
    flexShrink: 0,
  },
  noSchedule: {
    ...text.hint,
    color: colors.text40,
  },
  description: {
    ...text.cardBody,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  metaPlan: {
    ...text.hint,
    color: colors.text60,
    flexShrink: 1,
  },
  metaPrice: {
    ...text.hint,
    color: colors.primary,
    flexShrink: 0,
  },
});
