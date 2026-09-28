import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { Slider } from '../../components/ui/Slider';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { refreshControl } from '../../components/ui/ListParts';
import { SubscriptionChips } from '../../components/common/SubscriptionChips';
import { ActiveSubscriptionInfo } from '../../components/subscribe/ActiveSubscriptionInfo';
import { PlanCard } from '../../components/subscribe/PlanCard';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { CatalogService } from '../../services/catalog.service';
import { UsersService } from '../../services/users.service';
import { getTotalPrice } from '../../services/subscriptions.service';
import { colors, fs, layout, s, text, withAlpha } from '../../theme';
import { formatMoney, plural } from '../../utils/format';
import { isSubscriptionActive } from '../../utils/status';

/**
 * Подписка — фреймы «Subscribe» [61:1572] (активная)
 * и [62:890] (настройка тарифа).
 *
 * Композиция из макета: иллюстрация 500x500 сверху, поверх неё
 * кнопка «Подписка» и ряд маленьких карточек, а ниже —
 * полупрозрачная «шторка» со скруглением 30 сверху,
 * в которой лежит весь остальной контент.
 *
 * Расчёт стоимости — та же формула, что на сайте: базовая цена
 * тарифа минус скидка до 15% в зависимости от количества занятий.
 *
 * Оплата на сайте не автоматизирована: подписка оформляется через
 * поддержку или лично в центре. Поэтому «Оформить» показывает
 * инструкцию, а не имитирует несуществующий платёж.
 */

const HERO = require('../../../assets/images/subscribe-hero.jpg');

/* Цвета тарифов из макета: Стандарт фиолетовый, Premium+ синий */
const PLAN_COLORS = ['#8166E4', '#6E94F5', '#A187FF', '#EA9952'];

export const SubscribeScreen = ({ navigation }) => {
  const { user } = useAuth();

  const insets = useSafeAreaInsets();

  const [view, setView] = useState('configure');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [paymentVisible, setPaymentVisible] = useState(false);

  const loadSubscription = useCallback(async () => {
    const [profile, subscription, plans] = await Promise.all([
      UsersService.getProfile(user.id),
      UsersService.getActiveSubscription(user.id),
      CatalogService.getSubscriptionTypes(),
    ]);

    return { profile, subscription, plans };
  }, [user?.id]);

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadSubscription,
    [user?.id],
    { enabled: Boolean(user?.id) },
  );

  const activeSubscription = useMemo(() => {
    const subscription = data?.subscription;

    return isSubscriptionActive(subscription) ? subscription : null;
  }, [data?.subscription]);

  const plans = useMemo(
    () => (data?.plans ?? []).filter((plan) => plan.isActive !== false),
    [data?.plans],
  );

  /* Начальные значения — как в loadSubscriptionData на сайте */
  useEffect(() => {
    if (plans.length === 0) {
      return;
    }

    setView(activeSubscription ? 'info' : 'configure');

    const defaultPlanId =
      activeSubscription?.subscriptionTypeId &&
      plans.some((plan) => plan.id === activeSubscription.subscriptionTypeId)
        ? activeSubscription.subscriptionTypeId
        : plans[plans.length - 1].id;

    setSelectedPlanId(defaultPlanId);

    const defaultPlan =
      plans.find((plan) => plan.id === defaultPlanId) ?? plans[plans.length - 1];

    if (activeSubscription?.subscriptionTypeId === defaultPlanId) {
      setLessonsCount(
        Math.min(
          Math.max(activeSubscription.lessonsTotal, defaultPlan.minLessons),
          defaultPlan.maxLessons,
        ),
      );
    } else {
      setLessonsCount(defaultPlan.minLessons);
    }
  }, [activeSubscription, plans]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  /* Итог = цена занятия со скидкой × количество занятий */
  const totalPrice = useMemo(
    () => getTotalPrice(selectedPlan, lessonsCount),
    [selectedPlan, lessonsCount],
  );

  /* Смена тарифа сбрасывает количество занятий к минимуму тарифа */
  const switchPlan = (plan) => {
    setSelectedPlanId(plan.id);
    setLessonsCount(plan.minLessons);
  };

  /* Из настройки тарифа возвращаемся к активной подписке, а не назад */
  const goBack = () => {
    if (view === 'configure' && activeSubscription) {
      setView('info');
      return;
    }

    navigation.goBack();
  };

  /* Кнопка «Подписка» поверх иллюстрации — Frame 28 из макета */
  const backPill = (
    <Pressable
      onPress={goBack}
      style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Icon name="arrow-left" size={fs(24)} color={colors.text80} />
      <Text style={styles.backLabel}>Подписка</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.topArea}>{backPill}</View>
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <View style={styles.topArea}>{backPill}</View>
        <ErrorState description={error} onRetry={retry} />
      </Screen>
    );
  }

  const isConfigure = view === 'configure' || !activeSubscription;

  return (
    <View style={styles.root}>
      {/* Иллюстрация 500x500 из макета — уходит под статус-бар */}
      <Image source={HERO} style={styles.hero} resizeMode="cover" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + s(10) },
          isConfigure ? styles.contentWithBar : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
      >
      <View style={styles.topArea}>
        {backPill}

        <SubscriptionChips
          style={styles.chips}
          subscription={activeSubscription}
          /* В макете баллы показаны только при активной подписке */
          points={activeSubscription ? data?.profile?.bonusPoints ?? 0 : null}
          onPressSubscription={() => setView(isConfigure ? 'info' : 'configure')}
          onPressAction={() => setView('configure')}
          actionIcon={activeSubscription ? 'arrow-up-right' : 'plus-circle'}
        />
      </View>

      {/* «Шторка» со скруглением 30 — Frame 157 из макета */}
      <View style={styles.sheet}>
        {/* Подсказка — Frame 202 */}
        <View style={styles.hintCard}>
          <Icon name="info" size={fs(24)} color={colors.primary} />

          <Text style={styles.hintText}>
            {isConfigure
              ? 'При оформлении подписки у вас есть возможность настроить тариф под себя, а стоимость будет рассчитана автоматически исходя из выбранного количества занятий'
              : 'Вы можете увеличить количество занятий и со следующего месяца тариф изменится.'}
          </Text>
        </View>

        {isConfigure ? (
          <>
            <Text style={styles.sectionTitle}>Настроить подписку</Text>

            {plans.length === 0 ? (
              <Text style={styles.note}>
                Тарифы пока не настроены администратором.
              </Text>
            ) : null}

            {/* Тарифы — Frame 201 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.plans}
            >
              {plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  accent={PLAN_COLORS[index % PLAN_COLORS.length]}
                  selected={plan.id === selectedPlanId}
                  onPress={() => switchPlan(plan)}
                />
              ))}
            </ScrollView>

            {selectedPlan ? (
              <>
                <Text style={styles.fieldTitle}>Количество занятий</Text>

                <Slider
                  value={lessonsCount}
                  minimumValue={selectedPlan.minLessons}
                  maximumValue={selectedPlan.maxLessons}
                  step={1}
                  onValueChange={setLessonsCount}
                  valueLabel={
                    <Text style={styles.sliderValue}>{lessonsCount}</Text>
                  }
                />

                <Text style={styles.fieldTitle}>Итоговая стоимость</Text>

                <Text style={styles.total}>{formatMoney(totalPrice)}</Text>
              </>
            ) : null}
          </>
        ) : (
          <>
            <ActiveSubscriptionInfo
              subscription={activeSubscription}
              onEdit={() => setView('configure')}
              sectionTitleStyle={styles.sectionTitle}
              noteStyle={styles.note}
            />
          </>
        )}
      </View>

      </ScrollView>

      <BottomSheet
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        footer={
          <AppButton title="Понятно" onPress={() => setPaymentVisible(false)} />
        }
      >
        <Text style={styles.sheetTitle}>Оформление подписки</Text>

        <Text style={styles.sheetText}>
          Вы выбрали тариф «{selectedPlan?.name}» на {lessonsCount}{' '}
          {plural(lessonsCount, 'занятие', 'занятия', 'занятий')}. Итоговая
          стоимость — {formatMoney(totalPrice)}.
        </Text>

        <Text style={styles.sheetText}>
          Подписку необходимо оплатить заранее. Сделать это можно, написав в
          поддержку или лично по адресу Ясная 14к2. После оплаты администратор
          активирует подписку, и она появится в приложении.
        </Text>
      </BottomSheet>

      {/* Кнопка «Оформить» — в макете закреплена снизу */}
      {isConfigure && selectedPlan ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, s(24)) },
          ]}
        >
          <AppButton
            title="Оформить"
            onPress={() => setPaymentVisible(true)}
            iconRight={
              <Icon name="credit-card" size={fs(32)} color={colors.white} />
            }
            style={styles.submitButton}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: s(30),
  },
  contentWithBar: {
    paddingBottom: s(120),
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: s(500),
  },
  topArea: {
    gap: s(30),
  },
  /* Frame 28: белая на 50%, обводка #D9D9D9 на 60%, радиус 40 */
  backPill: {
    alignSelf: 'flex-start',
    marginHorizontal: layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    height: s(44),
    paddingHorizontal: s(20),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.white60,
    borderWidth: 1,
    borderColor: withAlpha('#D9D9D9', 0.6),
  },
  backLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
    color: colors.text80,
  },
  chips: {
    paddingRight: layout.gutter,
  },
  /* Frame 157: шторка #FAFAFA на 60%, радиус 30 сверху */
  sheet: {
    marginTop: s(33),
    minHeight: s(600),
    backgroundColor: withAlpha('#FAFAFA', 0.92),
    borderTopLeftRadius: layout.radius.lg,
    borderTopRightRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: withAlpha('#FAFAFA', 0.5),
    padding: layout.gutter,
    gap: s(10),
  },
  /* Frame 202 */
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.white20,
    borderRadius: layout.radius.md,
    padding: s(20),
  },
  hintText: {
    ...text.caption,
    color: colors.text80,
    lineHeight: fs(13) * 1.45,
    flex: 1,
  },
  sectionTitle: {
    ...text.sectionTitle,
    color: colors.text80,
    marginTop: s(8),
  },
  note: {
    ...text.hint,
    color: colors.text80,
    textAlign: 'center',
    paddingHorizontal: s(30),
  },

  /* ------------------------ настройка ------------------------ */

  plans: {
    gap: s(10),
    paddingRight: s(4),
  },
  fieldTitle: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(16),
    color: colors.text80,
    marginTop: s(8),
  },
  sliderValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(32),
    lineHeight: fs(32) * 1.1,
    color: colors.primary,
  },
  total: {
    ...text.amount,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: s(70),
    paddingTop: s(10),
  },
  submitButton: {
    height: s(72),
    borderRadius: layout.radius.lg,
  },

  sheetTitle: {
    ...text.sectionTitle,
    textAlign: 'center',
    marginBottom: s(16),
  },
  sheetText: {
    ...text.cardBody,
    marginBottom: s(12),
  },
  pressed: {
    opacity: 0.9,
  },
});
