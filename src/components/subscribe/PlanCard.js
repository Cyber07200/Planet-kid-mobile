import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../ui/Icon';
import { getPlanBenefits } from '../../services/subscriptions.service';
import { colors, fs, layout, s, text, withAlpha } from '../../theme';

/**
 * Карточка тарифа — Frame 201 макета «Subscribe».
 * accent — цвет тарифа (Стандарт фиолетовый, Premium+ синий).
 */
export const PlanCard = ({ plan, accent, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      {
        backgroundColor: withAlpha(accent, 0.1),
        borderColor: selected ? withAlpha(accent, 0.7) : 'transparent',
      },
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <View style={[styles.header, { backgroundColor: accent }]}>
      <View style={styles.titleRow}>
        <Icon name="credit-card" size={fs(30)} color={colors.white} />

        <Text style={styles.title} numberOfLines={1}>
          {plan.name}
        </Text>
      </View>

      <Text style={styles.term}>Срок: 1 месяц</Text>
    </View>

    {getPlanBenefits(plan).map((benefit) => (
      <View key={benefit} style={styles.benefitRow}>
        <Icon name="check-circle" size={fs(20)} color={accent} />
        <Text style={[styles.benefitLabel, { color: accent }]}>{benefit}</Text>
      </View>
    ))}
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    width: s(246),
    borderRadius: layout.radius.lg,
    borderWidth: 2,
    padding: s(10),
    gap: s(10),
  },
  header: {
    borderRadius: layout.radius.md,
    padding: s(20),
    gap: s(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  title: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    color: colors.white,
    flexShrink: 1,
  },
  term: {
    ...text.caption,
    color: colors.white80,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  benefitLabel: {
    ...text.caption,
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
  },
});
