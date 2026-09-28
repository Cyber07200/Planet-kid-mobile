import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../ui/Icon';

import { colors, fs, gradients, layout, s, text } from '../../theme';
import { formatShortDate } from '../../utils/date';

/**
 * Виджет подписки на главной — Frame 17 из макета Home.
 *
 * Активная подписка: градиент #6E94F5 → #82A8FF, радиус 20
 * со срезанным правым верхним углом 40, статус «Активно»
 * зелёным #64F651, снизу справа — «Активна до 18.02».
 *
 * Подписки нет: тёмная карточка (#323232 → #464646, оба на 80%)
 * со знаком «стоп», пояснением и синей кнопкой «Оформить
 * подписку» внутри — ровно как на фрейме главной.
 */
export const SubscriptionWidget = ({ subscription, onPress, style }) => {
  /* Подписка считается оформленной, если она пришла из базы */
  const isActive = Boolean(subscription);

  /*
   * Нет подписки — показываем тёмную карточку из макета Home:
   * знак «стоп», заголовок, пояснение и синяя кнопка внутри.
   */
  if (!isActive) {
    return (
      <View style={[styles.card, styles.inactiveCard, style]}>
        {/* Градиент #323232 → #464646, оба на 80% */}
        <LinearGradient
          colors={gradients.inactive}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Строка 1: знак «стоп» + заголовок */}
        <View style={styles.titleRow}>
          <Icon name="stop-sign" size={fs(32)} color={colors.white} />

          <Text style={styles.title} numberOfLines={1}>
            Подписка не оформлена
          </Text>
        </View>

        {/* Строка 2: пояснение с иконкой «i» */}
        <View style={styles.infoRow}>
          <Icon name="info" size={fs(24)} color={colors.white} />

          <Text style={styles.description}>
            Вы можете подобрать подходящий вам тариф перейдя по ссылке ниже.
          </Text>
        </View>

        {/* Строка 3: синяя кнопка 252x40 со скруглением [10,20,20,10] */}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.inactiveButton,
            pressed ? styles.pressed : null,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.inactiveButtonLabel}>Оформить подписку</Text>
        </Pressable>
      </View>
    );
  }

  const planName = subscription.type?.name ?? 'Подписка';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed ? styles.pressed : null, style]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Icon name="credit-card" size={fs(30)} color={colors.white} />
            <Text style={styles.title} numberOfLines={1}>
              {planName}
            </Text>
          </View>

          <Text style={styles.activeLabel}>Активно</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="info" size={fs(24)} color={colors.white} />
          <Text style={styles.description}>
            Осталось занятий: {subscription.lessonsLeft} из{' '}
            {subscription.lessonsTotal}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Icon name="clock" size={fs(16)} color={colors.white} />
          <Text style={styles.meta}>
            {subscription.endDate
              ? `Активна до ${formatShortDate(subscription.endDate)}`
              : 'Без ограничения'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.radius.md,
    borderTopRightRadius: layout.radius.pill,
    padding: s(20),
    gap: s(16),
  },
  /* Frame 17 из макета Home: 460x181, срезан правый верхний угол */
  inactiveCard: {
    overflow: 'hidden',
    gap: s(20),
  },
  /* Кнопка внутри тёмной карточки */
  inactiveButton: {
    alignSelf: 'flex-start',
    height: s(40),
    minWidth: s(252),
    paddingHorizontal: s(30),
    borderRadius: layout.radius.md,
    borderTopLeftRadius: layout.radius.sm,
    borderBottomLeftRadius: layout.radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveButtonLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(14),
    color: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flexShrink: 1,
  },
  title: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    color: colors.white,
    flexShrink: 1,
  },
  activeLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(15),
    color: colors.green,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  /* Пояснение в карточке: 15 Medium, белое на 80% */
  description: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white80,
    lineHeight: fs(15) * 1.3,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: s(5),
  },
  meta: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white,
  },
  pressed: {
    opacity: 0.9,
  },
});
