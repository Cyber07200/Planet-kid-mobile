import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';
import { Icon } from '../ui/Icon';
import { getPlanBenefits } from '../../services/subscriptions.service';
import { colors, fs, layout, s, text, withAlpha } from '../../theme';

/**
 * Активная подписка — фрейм «Subscribe» [61:1572]:
 * остаток занятий, преимущества тарифа и зачем нужны баллы.
 */
export const ActiveSubscriptionInfo = ({ subscription, onEdit, sectionTitleStyle, noteStyle }) => (
  <>
    {/* Осталось занятий — Frame 164 */}
    <View style={styles.remainingCard}>
      <View style={styles.remainingHeader}>
        <Text style={styles.remainingLabel}>Осталось занятий:</Text>
        <Icon name="help-circle" size={fs(24)} color={colors.text80} />
      </View>

      <View style={styles.remainingRow}>
        <Text style={styles.remainingValue}>{subscription.lessonsLeft}</Text>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.increaseButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.increaseLabel}>Увеличить</Text>
        </Pressable>
      </View>
    </View>

    <Text style={noteStyle}>
      Подписку необходимо будет оплатить заранее! Сделать это можно написав в поддержку или
      лично по адресу Ясная 14к2
    </Text>

    <Text style={sectionTitleStyle}>Что дает {subscription.type?.name ?? 'подписка'}?</Text>

    <View style={styles.benefits}>
      {(subscription.type ? getPlanBenefits(subscription.type) : []).map((benefit) => (
        <View key={benefit} style={styles.benefitRow}>
          <Icon name="check-circle" size={fs(24)} color={colors.text} />
          <Text style={styles.benefitLabel}>{benefit}</Text>
        </View>
      ))}
    </View>

    {/* Баллы — Frame 206 */}
    <View style={styles.pointsCard}>
      <Text style={styles.pointsTitle}>Зачем нужны баллы?</Text>
      <Text style={styles.pointsRow}>100 баллов - дополнительное занятие</Text>
      <Text style={styles.pointsRow}>250 баллов - мастер-класс в подарок</Text>
      <Text style={styles.pointsRow}>500 баллов - игрушка на выбор</Text>
    </View>

    <AppButton title="Редактировать подписку" onPress={onEdit} style={styles.editButton} />
  </>
);

const styles = StyleSheet.create({
  /* Frame 164: #FFB33A на 20% с такой же обводкой */
  remainingCard: {
    backgroundColor: withAlpha('#FFB33A', 0.2),
    borderWidth: 1,
    borderColor: withAlpha('#FFB33A', 0.2),
    borderRadius: layout.radius.md,
    padding: s(20),
    gap: s(10),
  },
  remainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(20),
    color: colors.text80,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(32),
    color: colors.text80,
  },
  increaseButton: {
    height: s(31),
    borderRadius: layout.radius.md,
    backgroundColor: colors.orange,
    paddingHorizontal: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  increaseLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(14),
    color: colors.background,
  },
  benefits: {
    gap: s(10),
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  benefitLabel: {
    ...text.cardTitle,
    color: colors.text70,
    flex: 1,
  },
  pointsCard: {
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.md,
    padding: s(20),
    gap: s(10),
    marginTop: s(8),
  },
  pointsTitle: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
    color: colors.primary,
  },
  pointsRow: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(16),
    color: colors.primary,
  },
  editButton: {
    marginTop: s(10),
    marginBottom: s(10),
  },
  pressed: {
    opacity: 0.9,
  },
});
