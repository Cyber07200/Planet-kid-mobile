import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { refreshControl } from '../../components/ui/ListParts';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { LessonCard } from '../../components/common/LessonCard';
import { LessonSheet } from '../../components/common/LessonSheet';
import { MonthCalendar } from '../../components/common/MonthCalendar';
import { OnceBookingSheet } from '../../components/common/OnceBookingSheet';
import { WeekStrip } from '../../components/common/WeekStrip';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useBookingSheet } from '../../hooks/useBookingSheet';
import { BookingsService } from '../../services/bookings.service';
import { CatalogService } from '../../services/catalog.service';
import { UsersService } from '../../services/users.service';
import {
  buildCalendarEvents,
  getBookingRange,
  getDateRange,
  groupEventsByDate,
} from '../../services/calendar';
import { colors, fs, layout, s, text } from '../../theme';
import { formatSelectedDayLabel, getTodayKey } from '../../utils/date';
import { logWarn } from '../../utils/logger';
import { isSubscriptionActive, mergeBookings } from '../../utils/status';

/**
 * Календарь — макеты «Calendar», «Calendar (Calendar fullsize)»,
 * «Calendar (Modal)» и «Calendar (Modal Check)».
 *
 * Сверху лента недели (или сетка месяца по стрелке у заголовка),
 * ниже — занятия выбранного дня.
 */

const DaySeparator = () => <View style={styles.separator} />;

/* Отмены — необязательные таблицы: без них календарь работает */
const loadCancellations = (kind, ids, range) =>
  BookingsService.getCancellations(kind, ids, range.todayKey, range.maxDateKey).catch(
    (error) => {
      logWarn(`calendar: отмены (${kind})`, error);
      return [];
    },
  );

const loadCalendarData = async (userId, range) => {
  const [children, subscription, groupSchedules, individualSchedules] = await Promise.all([
    UsersService.getChildren(userId),
    UsersService.getActiveSubscription(userId),
    CatalogService.getGroupSchedules(),
    CatalogService.getIndividualSchedules(),
  ]);

  const groupIds = groupSchedules.map((item) => item.id);
  const individualIds = individualSchedules.map((item) => item.id);

  const [groupBookings, individualBookings, groupCancellations, individualCancellations] =
    await Promise.all([
      BookingsService.getBookingsInRange('group', groupIds, range.todayKey, range.maxDateKey),
      BookingsService.getBookingsInRange(
        'individual',
        individualIds,
        range.todayKey,
        range.maxDateKey,
      ),
      loadCancellations('group', groupIds, range),
      loadCancellations('individual', individualIds, range),
    ]);

  return {
    children,
    subscription,
    groupSchedules,
    individualSchedules,
    groupBookings,
    individualBookings,
    groupCancellations,
    individualCancellations,
  };
};

/* Расписание того же направления — для блока в окне занятия */
const getRelatedSchedules = (event, data) => {
  if (!event || !data) {
    return [];
  }

  const schedules =
    event.type === 'group'
      ? data.groupSchedules.filter((item) => item.activityTypeId === event.activityId)
      : data.individualSchedules.filter(
          (item) => item.individualActivity?.activityTypeId === event.activityId,
        );

  return schedules.map(({ id, dayOfWeek, startTime }) => ({ id, dayOfWeek, startTime }));
};

export const CalendarScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [selectedDateKey, setSelectedDateKey] = useState(getTodayKey);
  const [monthVisible, setMonthVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  /* Горизонт записи: от сегодня на месяц вперёд — как на сайте */
  const range = useMemo(() => getBookingRange(), []);

  const dates = useMemo(() => getDateRange(range.today, range.maxDate), [range]);

  const loadCalendar = useCallback(() => loadCalendarData(userId, range), [range, userId]);

  const { data, setData, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadCalendar,
    [userId],
    { enabled: Boolean(userId) },
  );

  /* Расписание («день недели + время») разворачивается в занятия на датах */
  const events = useMemo(
    () => (data ? buildCalendarEvents({ ...data, dates }) : []),
    [data, dates],
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  const dayEvents = eventsByDate.get(selectedDateKey) ?? [];

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const children = useMemo(() => data?.children ?? [], [data?.children]);

  const activeSubscription = isSubscriptionActive(data?.subscription)
    ? data.subscription
    : null;

  /* Свежие записи подмешиваем сразу, не дожидаясь перезагрузки календаря */
  const onCreated = useCallback(
    (created, event) => {
      const key = event?.type === 'individual' ? 'individualBookings' : 'groupBookings';

      setData((current) =>
        current ? { ...current, [key]: mergeBookings(current[key], created) } : current,
      );
    },
    [setData],
  );

  const { booking, setSelectedChildIds, sheetProps, onceSheetProps, cancelDialogProps } =
    useBookingSheet({
      userId,
      subscription: activeSubscription,
      children,
      event: selectedEvent,
      onSuccess: refresh,
      onCreated,
    });

  const openEvent = (event) => {
    booking.reset();
    setSelectedEventId(event.id);

    /* Свободный ребёнок один — сразу отмечаем его, как на сайте */
    const available = children.filter((child) => !event.bookedChildIds.includes(child.id));

    setSelectedChildIds(available.length === 1 ? [available[0].id] : []);
  };

  const closeEvent = () => {
    if (booking.loading) {
      return;
    }

    setSelectedEventId(null);
    setSelectedChildIds([]);
    booking.reset();
  };

  const header = (
    <ScreenHeader
      title="Календарь"
      right={
        <Pressable
          onPress={() => setMonthVisible((current) => !current)}
          hitSlop={s(10)}
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ expanded: monthVisible }}
          accessibilityLabel={monthVisible ? 'Свернуть календарь' : 'Календарь на месяц'}
        >
          <Icon
            name={monthVisible ? 'chevron-up' : 'chevron-down'}
            size={fs(20)}
            color={colors.primary}
          />
        </Pressable>
      }
    />
  );

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        header={header}
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем расписание..."
        withTabBarSpacing
      />
    );
  }

  return (
    <Screen withTabBarSpacing>
      {header}

      {monthVisible ? (
        /* Фрейм «Calendar (Calendar fullsize)» */
        <View style={styles.monthWrapper}>
          <MonthCalendar
            minDate={range.today}
            maxDate={range.maxDate}
            selectedDateKey={selectedDateKey}
            eventsByDate={eventsByDate}
            onSelect={(key) => {
              setMonthVisible(false);
              setSelectedDateKey(key);
            }}
          />
        </View>
      ) : (
        <WeekStrip
          minDate={range.today}
          maxDate={range.maxDate}
          selectedDateKey={selectedDateKey}
          isMarked={(key) => eventsByDate.has(key)}
          onSelect={setSelectedDateKey}
        />
      )}

      {/* Frame 25: занятия только выбранного дня */}
      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
        ListHeaderComponent={
          <Text style={styles.dayLabel}>{formatSelectedDayLabel(selectedDateKey)}</Text>
        }
        renderItem={({ item }) => <LessonCard event={item} onPress={() => openEvent(item)} />}
        ItemSeparatorComponent={DaySeparator}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="На этот день занятий нет"
            description="Выберите другой день в ленте сверху или откройте календарь на месяц."
          />
        }
      />

      <LessonSheet
        {...sheetProps}
        onClose={closeEvent}
        schedules={getRelatedSchedules(selectedEvent, data)}
      />

      <OnceBookingSheet {...onceSheetProps} />

      <ConfirmDialog {...cancelDialogProps} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  monthButton: {
    width: s(34),
    height: s(34),
    borderRadius: layout.radius.pill,
    backgroundColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthWrapper: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(25),
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(25),
    paddingBottom: s(20),
  },
  /* Заголовок выбранного дня — Comfortaa SemiBold 20, как в макете */
  dayLabel: {
    ...text.sectionHeading,
    marginBottom: s(20),
  },
  separator: {
    height: s(20),
  },
  pressed: {
    opacity: 0.85,
  },
});
