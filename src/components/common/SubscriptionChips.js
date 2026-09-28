import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../ui/Icon';
import { colors, fs, layout, s, text, withAlpha } from '../../theme';
import { formatShortDate } from '../../utils/date';

/**
 * Ряд маленьких карточек над «шторкой» на экранах
 * «Подписка» и «Профиль» — Frame 192 из макета.
 *
 * Состав по макету:
 *   подписка 202x106 (или «Не оформленно» 288x106 тёмной заливкой)
 *   баллы 225x106 оранжевым
 *   круглая кнопка 88x106 со стрелкой или плюсом
 *
 * Ряд шире экрана, поэтому в макете он обрезается справа —
 * здесь он прокручивается вбок.
 */
export const SubscriptionChips = ({
  subscription,
  points = null,
  onPressSubscription,
  onPressAction,
  actionIcon = 'arrow-up-right',
  style,
}) => {
  /*
   * В макете кнопка справа выглядит по-разному:
   * плюс — синий на почти белом полупрозрачном квадрате,
   * стрелка — тёмная на сером.
   */
  const isPlus = actionIcon === 'plus-circle';

  return (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={[styles.row, style]}
  >
    {subscription ? (
      <Pressable
        onPress={onPressSubscription}
        style={({ pressed }) => [
          styles.card,
          styles.subscriptionCard,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <Icon name="credit-card" size={fs(30)} color={colors.white} />

          <Text style={styles.cardTitle} numberOfLines={1}>
            {subscription.type?.name ?? 'Подписка'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Icon name="clock" size={fs(16)} color={colors.green} />

          <Text style={styles.activeUntil} numberOfLines={1}>
            {subscription.endDate
              ? `Активна до ${formatShortDate(subscription.endDate)}`
              : 'Без ограничения'}
          </Text>
        </View>
      </Pressable>
    ) : (
      <Pressable
        onPress={onPressSubscription}
        style={({ pressed }) => [
          styles.card,
          styles.inactiveCard,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <Icon name="credit-card" size={fs(30)} color={colors.white} />

          <Text style={styles.cardTitle} numberOfLines={1}>
            Не оформлено
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Icon name="clock" size={fs(16)} color={colors.white60} />

          <Text style={styles.hurry} numberOfLines={1}>
            Успейте оформить
          </Text>
        </View>
      </Pressable>
    )}

    {points !== null ? (
      <View style={[styles.card, styles.pointsCard]}>
        <View style={styles.pointsHeader}>
          <Text style={styles.pointsLabel}>Вам доступно:</Text>
          <Icon name="help-circle" size={fs(24)} color={colors.white} />
        </View>

        <Text style={styles.pointsValue} numberOfLines={1}>
          {points} баллов
        </Text>
      </View>
    ) : null}

    <Pressable
      onPress={onPressAction}
      style={({ pressed }) => [
        styles.actionCard,
        isPlus ? styles.actionCardLight : styles.actionCardMuted,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Подписка"
    >
      <Icon
        name={actionIcon}
        size={fs(48)}
        color={isPlus ? colors.primary : colors.text}
      />
    </Pressable>
  </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: s(10),
    paddingHorizontal: layout.gutter,
  },
  card: {
    height: s(106),
    borderRadius: layout.radius.md,
    padding: s(20),
    justifyContent: 'space-between',
  },
  subscriptionCard: {
    width: s(202),
    backgroundColor: colors.primary80,
  },
  inactiveCard: {
    width: s(288),
    backgroundColor: withAlpha('#323232', 0.8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  cardTitle: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    color: colors.white,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: s(5),
  },
  activeUntil: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.green,
  },
  hurry: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white60,
  },
  pointsCard: {
    width: s(225),
    backgroundColor: colors.orange80,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  pointsLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(16),
    color: colors.white,
  },
  pointsValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(36),
    lineHeight: fs(36) * 1.1,
    color: colors.white,
  },
  actionCard: {
    width: s(88),
    height: s(106),
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Frame 18 из «Subscribe»: #FAFAFA на 60% */
  actionCardLight: {
    backgroundColor: withAlpha('#FAFAFA', 0.6),
  },
  /* Frame 18 из «Profile»: #323232 на 10% */
  actionCardMuted: {
    backgroundColor: colors.text10,
  },
  pressed: {
    opacity: 0.9,
  },
});
