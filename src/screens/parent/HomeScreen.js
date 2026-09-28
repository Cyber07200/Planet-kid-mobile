import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { DirectionCard } from '../../components/common/DirectionCard';
import { HomeHeader, LatestNotification } from '../../components/common/HomeParts';
import { SubscriptionWidget } from '../../components/common/SubscriptionWidget';
import { refreshControl } from '../../components/ui/ListParts';
import { ScreenStatus } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDismissed } from '../../hooks/useDismissed';
import { BookingsService } from '../../services/bookings.service';
import { CatalogService } from '../../services/catalog.service';
import { NotificationsService } from '../../services/notifications.service';
import { UsersService } from '../../services/users.service';
import { colors, fs, gradients, layout, s, text } from '../../theme';
import { formatTime, getRelativeDayLabel } from '../../utils/date';
import { logWarn } from '../../utils/logger';
import { getUpcomingBookings } from '../../utils/status';

/**
 * Главная — макет «Home» [0:516] / [0:2266] / [0:727].
 *
 * Состав по макету:
 *   шапка с приветствием и кнопкой настроек
 *   промо-баннер «Запишись на занятие уже сейчас!»
 *   виджет подписки (или блок «Подписка не оформлена»)
 *   блок «Уведомления» + «Посмотреть все»
 *   блок «Специальные предложения» — карточки направлений
 *
 * Все данные — из Supabase, заглушек нет.
 */
export const HomeScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();

  /*
   * Баннер «Подписка - выгодно» показывается один раз:
   * закрыли — отметка уходит в AsyncStorage и баннер
   * больше не появляется даже после перезапуска.
   */
  const { isDismissed: promoDismissed, isReady: promoReady, dismiss: dismissPromo } =
    useDismissed('promo-subscription');

  /*
   * Один запрос на всю главную: профиль, дети, подписка,
   * направления и уведомления грузятся параллельно,
   * записи детей — следом, когда известны их id.
   */
  const userId = user?.id;

  const loadHomeData = useCallback(async () => {
    const [profile, children, subscription, directions, notifications] = await Promise.all([
      UsersService.getProfile(userId),
      UsersService.getChildren(userId),
      UsersService.getActiveSubscription(userId),
      CatalogService.getDirectionsWithSchedules(),
      /* Без уведомлений главная всё равно полезна */
      NotificationsService.getForUser(userId).catch((notificationsError) => {
        logWarn('home: уведомления', notificationsError);
        return [];
      }),
    ]);

    const bookings = await BookingsService.getBookingsForChildren(
      userId,
      children.map((child) => child.id),
    );

    return { profile, children, subscription, directions, notifications, bookings };
  }, [userId]);

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadHomeData,
    [userId],
    { enabled: Boolean(userId) },
  );

  /* Ближайшие записи: только активные и не раньше сегодняшнего дня */
  const upcomingBookings = useMemo(
    () => getUpcomingBookings(data?.bookings),
    [data?.bookings],
  );

  /* «Специальные предложения» — первые три направления из базы */
  const specialOffers = data?.directions?.slice(0, 3) ?? [];

  /* Свайп вниз обновляет и экран, и профиль в контексте */
  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshUser().catch(() => null)]);
  }, [refresh, refreshUser]);

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем главную..."
        withTabBarSpacing
      />
    );
  }

  const firstName = data?.profile?.firstName ?? user?.firstName ?? 'Пользователь';

  return (
    <Screen
      scroll
      withTabBarSpacing
      contentContainerStyle={styles.content}
      refreshControl={refreshControl(isRefreshing, handleRefresh)}
    >
      <HomeHeader
        firstName={firstName}
        lastName={data?.profile?.lastName}
        avatar={data?.profile?.avatar}
        accentName
        onPressProfile={() => navigation.navigate('Profile')}
        onPressSettings={() => navigation.navigate('Settings')}
      />

      {/*
        Баннер «Подписка - выгодно» — Frame 4 из макета.
        Показывается над карточкой подписки и только до
        первого закрытия крестиком.
      */}
      {promoReady && !promoDismissed ? (
        <LinearGradient
          colors={gradients.primarySoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* Строка с заголовком и крестиком */}
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerTitle}>Подписка - выгодно</Text>

            <Pressable
              onPress={dismissPromo}
              hitSlop={s(10)}
              style={({ pressed }) => [styles.bannerClose, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Больше не показывать"
            >
              <Icon name="x" size={fs(14)} color={colors.white} />
            </Pressable>
          </View>

          {/* Пояснение белым на 80% */}
          <Text style={styles.bannerText}>
            В нашем центре действует формат подписок который позволяет посещать
            занятия, которые включены в тариф. Это позволит вам посещать любые
            занятия из подписки.
          </Text>

          {/* Белая кнопка 262x34 со стрелкой */}
          <Pressable
            onPress={() => navigation.navigate('Subscribe')}
            style={({ pressed }) => [styles.bannerButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.bannerButtonLabel}>Подобрать подписку</Text>
            <Icon name="arrow-up-right" size={fs(14)} color={colors.text60} />
          </Pressable>
        </LinearGradient>
      ) : null}

      {/* Подписка */}
      <SubscriptionWidget
        subscription={data?.subscription}
        onPress={() => navigation.navigate('Subscribe')}
        style={styles.block}
      />

      {/* Уведомления */}
      <Text style={styles.sectionLabel}>Уведомления</Text>

      <LatestNotification
        notification={data?.notifications?.[0]}
        onPress={() => navigation.navigate('Notifications')}
      />

      {/* Специальные предложения */}
      <Text style={styles.sectionLabel}>Специальные предложения</Text>

      {specialOffers.length > 0 ? (
        <View style={styles.offers}>
          {specialOffers.map((direction) => (
            <DirectionCard
              key={direction.id}
              direction={direction}
              /* Открываем страницу направления с его занятиями */
              onPress={() =>
                navigation.navigate('Direction', { directionId: direction.id })
              }
            />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyNotificationText}>
            Пока нет доступных направлений
          </Text>
        </Card>
      )}

      {/*
        Ближайшие занятия детей — блок повторяет сайт:
        заголовок со ссылкой «Календарь», до трёх ближайших занятий,
        а полный список открывается отдельной страницей.
      */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabelInline}>Ближайшие занятия</Text>

        <Pressable
          onPress={() => navigation.navigate('Upcoming')}
          style={({ pressed }) => [styles.sectionLink, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.sectionLinkLabel}>
            {upcomingBookings.length > 0 ? 'Смотреть все' : 'Открыть календарь'}
          </Text>

          <Icon name="chevron-right" size={fs(14)} color={colors.primary} />
        </Pressable>
      </View>

      {upcomingBookings.length > 0 ? (
        <View style={styles.offers}>
          {upcomingBookings.slice(0, 3).map((booking) => {
            const child = data?.children?.find(
              (item) => item.id === booking.childId,
            );

            return (
              <Card
                key={booking.id}
                style={styles.lessonRow}
                /* Нажатие ведёт на страницу со всеми занятиями */
                onPress={() => navigation.navigate('Upcoming')}
              >
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonName} numberOfLines={1}>
                    {booking.activityName ?? 'Занятие'}
                  </Text>

                  <Text style={styles.lessonChild} numberOfLines={1}>
                    {child?.firstName ?? 'Ребёнок'}
                  </Text>
                </View>

                <View style={styles.lessonMeta}>
                  <Text style={styles.lessonDate}>
                    {getRelativeDayLabel(booking.lessonDate)}
                  </Text>

                  <Text style={styles.lessonTime}>
                    {formatTime(booking.startTime)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        /* Пустое состояние — как на сайте: подсказка и кнопка календаря */
        <Card style={styles.lessonEmpty}>
          <View style={styles.lessonEmptyIcon}>
            <Icon name="calendar" size={fs(20)} color={colors.primary} />
          </View>

          <View style={styles.lessonEmptyBody}>
            <Text style={styles.lessonName}>Ближайших занятий нет</Text>

            <Text style={styles.lessonChild}>
              Выберите занятие в календаре, чтобы записать ребёнка.
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(10),
    gap: s(20),
  },
  banner: {
    borderRadius: layout.radius.md,
    padding: s(20),
    gap: s(12),
    borderWidth: 2,
    /* В макете обводка баннера — белая на 10% */
    borderColor: colors.white10,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  bannerTitle: {
    fontFamily: text.cardTitle.fontFamily,
    fontSize: text.sectionLabel.fontSize,
    color: colors.background,
    flexShrink: 1,
  },
  bannerClose: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: colors.white40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    lineHeight: fs(15) * 1.35,
    color: colors.white80,
  },
  /* Frame 7 из макета: 262x34, белая, радиус 20 */
  bannerButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    height: s(34),
    minWidth: s(262),
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: layout.radius.md,
    paddingHorizontal: s(30),
  },
  bannerButtonLabel: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: '#666666',
  },
  block: {
    marginTop: 0,
  },
  sectionLabel: {
    ...text.sectionLabel,
    marginTop: s(4),
  },
  /* Заголовок блока со ссылкой справа — как на сайте */
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
    marginTop: s(4),
  },
  sectionLabelInline: {
    ...text.sectionLabel,
    flexShrink: 1,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    flexShrink: 0,
  },
  sectionLinkLabel: {
    ...text.hint,
    color: colors.primary,
  },
  /* Пустой блок «Ближайших занятий нет» */
  lessonEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  lessonEmptyIcon: {
    width: s(40),
    height: s(40),
    borderRadius: layout.radius.sm,
    backgroundColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonEmptyBody: {
    flexShrink: 1,
    gap: s(4),
  },
  emptyNotificationText: {
    ...text.cardTitle,
    color: colors.text70,
    textAlign: 'center',
  },
  offers: {
    gap: s(10),
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  lessonInfo: {
    flexShrink: 1,
    gap: s(4),
  },
  lessonName: {
    ...text.cardTitle,
  },
  lessonChild: {
    ...text.hint,
    color: colors.text60,
  },
  lessonMeta: {
    alignItems: 'flex-end',
    gap: s(4),
  },
  lessonDate: {
    ...text.cardTitle,
    color: colors.primary,
  },
  lessonTime: {
    ...text.hint,
    color: colors.text70,
  },
  pressed: {
    opacity: 0.85,
  },
});
