import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { AppButton } from '../../components/ui/AppButton';
import { DirectionCard } from '../../components/common/DirectionCard';
import { ListSeparator, refreshControl } from '../../components/ui/ListParts';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { useParentDirectionsData } from '../../hooks/useParentDirectionsData';
import { colors, fs, layout, s, text } from '../../theme';
import { formatShortDate, formatTime, getRelativeDayLabel } from '../../utils/date';
import { getUpcomingBookings } from '../../utils/status';

/**
 * «Ближайшие занятия» — отдельная страница.
 *
 * Повторяет блок «Ближайшие занятия» с сайта (HomePage.tsx):
 * список будущих записей по возрастанию даты, у каждой записи —
 * название занятия, имя ребёнка, дата и время; рядом кнопка,
 * открывающая календарь.
 *
 * На главной этот блок показывает только несколько ближайших
 * занятий, а здесь видно всё сразу. Ниже — карточки направлений
 * (такие же, как на сайте), чтобы записаться можно было прямо
 * отсюда: запись уходит в базу и создаёт уведомление.
 *
 * В нижнюю панель экран не добавляется — он открывается
 * с главной, поверх вкладок.
 */
export const UpcomingLessonsScreen = ({ navigation }) => {
  const { data, isLoading, isRefreshing, error, refresh, retry } = useParentDirectionsData();

  /*
   * Ближайшие занятия: только активные записи и только те,
   * что не раньше сегодняшнего дня. Сортировка — по дате,
   * внутри дня по времени начала (как в HomePage.tsx).
   */
  const upcoming = useMemo(() => getUpcomingBookings(data?.bookings), [data?.bookings]);

  /* Переход в календарь: вкладка внутри стека Tabs */
  const openCalendar = useCallback(() => {
    navigation.navigate('Tabs', { screen: 'Calendar' });
  }, [navigation]);

  const header = <ScreenHeader title="Ближайшие занятия" onBack={() => navigation.goBack()} />;

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        header={header}
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем занятия..."
      />
    );
  }

  /* Шапка списка: кнопка календаря и подпись */
  const renderHeader = () => (
    <View style={styles.header}>
      <AppButton
        title="Открыть календарь"
        icon={<Icon name="calendar" size={fs(20)} color={colors.white} />}
        onPress={openCalendar}
      />

      <Text style={styles.hint}>
        {upcoming.length > 0
          ? 'Здесь видны все занятия, на которые записаны ваши дети.'
          : 'Выберите занятие в календаре или направление ниже, чтобы записать ребёнка.'}
      </Text>
    </View>
  );

  /* Подвал списка: карточки направлений — как на сайте */
  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.sectionLabel}>Записаться на занятие</Text>

      {(data?.directions ?? []).length > 0 ? (
        <View style={styles.directions}>
          {data.directions.map((direction) => (
            <DirectionCard
              key={direction.id}
              direction={direction}
              /* Открывается страница направления с его занятиями */
              onPress={() =>
                navigation.navigate('Direction', { directionId: direction.id })
              }
            />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyText}>Пока нет доступных направлений</Text>
        </Card>
      )}
    </View>
  );

  return (
    <Screen>
      {header}

      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ItemSeparatorComponent={ListSeparator}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="Ближайших занятий нет"
            description="Запишите ребёнка на занятие — оно появится в этом списке."
          />
        }
        renderItem={({ item }) => {
          const child = data?.children?.find(
            (person) => person.id === item.childId,
          );

          return (
            /* Строка занятия — как на сайте: слева занятие и ребёнок, справа дата */
            <Card style={styles.row} onPress={openCalendar}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}>
                  <Icon name="calendar" size={fs(20)} color={colors.white} />
                </View>

                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.activityName ?? 'Занятие'}
                  </Text>

                  <Text style={styles.rowChild} numberOfLines={1}>
                    {child?.firstName ?? 'Ребёнок'}
                    {/* Разовая запись помечается отдельно */}
                    {item.subscriptionId ? '' : ' · разовое занятие'}
                  </Text>
                </View>
              </View>

              <View style={styles.rowMeta}>
                <Text style={styles.rowDate}>
                  {getRelativeDayLabel(item.lessonDate)}
                </Text>

                <Text style={styles.rowTime}>
                  {item.startTime
                    ? formatTime(item.startTime)
                    : formatShortDate(item.lessonDate)}
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(20),
    paddingBottom: s(30),
  },
  header: {
    gap: s(12),
    marginBottom: s(20),
  },
  hint: {
    ...text.cardBody,
    color: colors.text60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flexShrink: 1,
  },
  /* Квадратная иконка занятия — как в блоке на сайте */
  rowIcon: {
    width: s(40),
    height: s(40),
    borderRadius: layout.radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flexShrink: 1,
    gap: s(2),
  },
  rowTitle: {
    ...text.cardTitle,
  },
  rowChild: {
    ...text.hint,
    color: colors.text60,
  },
  rowMeta: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: s(2),
  },
  rowDate: {
    ...text.caption,
    color: colors.primary,
  },
  rowTime: {
    ...text.hint,
    color: colors.text60,
  },
  footer: {
    marginTop: s(24),
  },
  sectionLabel: {
    ...text.sectionHeading,
    marginBottom: s(12),
  },
  directions: {
    gap: s(10),
  },
  emptyText: {
    ...text.cardBody,
  },
});
