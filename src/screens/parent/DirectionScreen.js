import React, { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { ListSeparator, refreshControl } from '../../components/ui/ListParts';
import { LessonSheet } from '../../components/common/LessonSheet';
import { OnceBookingSheet } from '../../components/common/OnceBookingSheet';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { useDirectionBooking } from '../../hooks/useDirectionBooking';
import { useParentDirectionsData } from '../../hooks/useParentDirectionsData';
import { buildDirectionSlot, getTeacherName } from '../../services/calendar';
import { colors, fs, layout, s, text } from '../../theme';
import { DAY_FULL, formatTime, getRelativeDayLabel } from '../../utils/date';
import { extractAgeLabel, formatMoney, stripAgeLabel } from '../../utils/format';

/**
 * Страница направления.
 *
 * Открывается из списка направлений и с главной. Показывает
 * само направление (изображение, название, возраст, описание,
 * тариф и стоимость занятия) и все его занятия в расписании.
 * По нажатию на занятие открывается окно записи: по подписке или разово.
 */

const Fact = ({ icon, label }) => (
  <View style={styles.fact}>
    <Icon name={icon} size={fs(16)} color={colors.text60} />
    <Text style={styles.factLabel}>{label}</Text>
  </View>
);

const DirectionHeader = ({ direction, title }) => {
  const ageLabel = extractAgeLabel(direction.name);

  const price = Number(
    direction.schedules?.[0]?.pricePerLesson ??
      direction.subscriptionType?.basePricePerLesson ??
      0,
  );

  return (
    <View style={styles.header}>
      {direction.image ? (
        <Image source={{ uri: direction.image }} style={styles.hero} resizeMode="cover" />
      ) : null}

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>

        {ageLabel ? <Text style={styles.age}>{ageLabel}</Text> : null}
      </View>

      <Text style={styles.description}>
        {direction.description || 'Описание направления пока не добавлено.'}
      </Text>

      <View style={styles.facts}>
        {direction.subscriptionType?.name ? (
          <Fact icon="bookmark" label={direction.subscriptionType.name} />
        ) : null}

        {direction.durationMinutes ? (
          <Fact icon="clock" label={`${direction.durationMinutes} мин.`} />
        ) : null}

        {price > 0 ? <Fact icon="credit-card" label={`${formatMoney(price)} / занятие`} /> : null}
      </View>

      <Text style={styles.sectionLabel}>Занятия направления</Text>
    </View>
  );
};

/* Карточка занятия направления — по ней открывается запись */
const DirectionLessonCard = ({ lesson, onPress }) => {
  const isBooked = lesson.bookedChildren.length > 0;
  const isFull = !isBooked && lesson.spotsLeft <= 0;

  return (
    <Card onPress={onPress} selected={isBooked} style={styles.lesson}>
      <View style={styles.lessonHead}>
        <Text style={styles.lessonDay}>
          {DAY_FULL[lesson.dayOfWeek]}, {formatTime(lesson.startTime)}
          {lesson.endTime ? `–${formatTime(lesson.endTime)}` : ''}
        </Text>

        {isBooked ? (
          <View style={styles.bookedPill}>
            <Icon name="check" size={fs(12)} color={colors.primary} />
            <Text style={styles.bookedPillLabel}>Вы записаны</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.lessonDate}>Ближайшее: {getRelativeDayLabel(lesson.lessonDate)}</Text>

      <View style={styles.lessonFoot}>
        <View style={styles.teacherRow}>
          <Icon name="users" size={fs(14)} color={colors.text60} />

          <Text style={styles.teacher} numberOfLines={1}>
            {getTeacherName(lesson.teacher)}
          </Text>
        </View>

        <Text
          style={[
            styles.spots,
            isFull ? styles.spotsFull : null,
            isBooked ? styles.spotsBooked : null,
          ]}
        >
          {isBooked
            ? lesson.bookedChildren.map((child) => child.firstName).join(', ')
            : isFull
              ? 'Нет мест'
              : `Свободно: ${lesson.spotsLeft}`}
        </Text>
      </View>

      {lesson.kind === 'individual' ? (
        <Text style={styles.individual}>Индивидуальное занятие</Text>
      ) : null}
    </Card>
  );
};

export const DirectionScreen = ({ navigation, route }) => {
  const directionId = route?.params?.directionId ?? null;

  const { userId, data, setData, isLoading, isRefreshing, error, refresh, retry } =
    useParentDirectionsData();

  const { openDirection, sheetProps, onceSheetProps, cancelDialogProps } =
    useDirectionBooking({ userId, data, setData, refresh });

  const direction = useMemo(
    () => data?.directions?.find((item) => item.id === directionId) ?? null,
    [data?.directions, directionId],
  );

  /* Статус каждого занятия виден прямо в списке, без открытия карточки */
  const lessons = useMemo(
    () =>
      (direction?.schedules ?? []).map((schedule) => ({
        ...schedule,
        ...buildDirectionSlot({
          direction,
          schedule,
          bookings: data?.bookings,
          children: data?.children,
        }),
      })),
    [data?.bookings, data?.children, direction],
  );

  const title = direction ? stripAgeLabel(direction.name) || direction.name : 'Направление';
  const header = <ScreenHeader title={title} onBack={() => navigation.goBack()} />;

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        header={header}
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем направление..."
      />
    );
  }

  if (!direction) {
    return (
      <Screen>
        {header}

        <EmptyState
          icon="globe"
          title="Направление не найдено"
          description="Возможно, его скрыли из каталога. Вернитесь к списку направлений."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
        ListHeaderComponent={<DirectionHeader direction={direction} title={title} />}
        ItemSeparatorComponent={ListSeparator}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="Расписание пока не составлено"
            description="Уточните время занятий у администратора центра."
          />
        }
        renderItem={({ item }) => (
          <DirectionLessonCard lesson={item} onPress={() => openDirection(direction, item.id)} />
        )}
      />

      <LessonSheet {...sheetProps} />
      <OnceBookingSheet {...onceSheetProps} />
      <ConfirmDialog {...cancelDialogProps} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(16),
    paddingBottom: s(30),
  },
  header: {
    gap: s(12),
    marginBottom: s(16),
  },
  hero: {
    width: '100%',
    height: s(200),
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  title: {
    ...text.sectionTitle,
    flexShrink: 1,
  },
  age: {
    ...text.sectionTitle,
    color: colors.primary,
  },
  description: {
    ...text.cardBody,
    color: colors.text70,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: layout.radius.pill,
    paddingHorizontal: s(12),
    paddingVertical: s(6),
  },
  factLabel: {
    ...text.hint,
    color: colors.text60,
  },
  sectionLabel: {
    ...text.sectionHeading,
    marginTop: s(8),
  },
  lesson: {
    gap: s(8),
  },
  lessonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  lessonDay: {
    ...text.cardTitle,
    flexShrink: 1,
  },
  bookedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.pill,
    paddingHorizontal: s(8),
    paddingVertical: s(4),
  },
  bookedPillLabel: {
    ...text.hint,
    color: colors.primary,
  },
  lessonDate: {
    ...text.hint,
    color: colors.text60,
  },
  lessonFoot: {
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
    color: colors.green,
    flexShrink: 0,
  },
  spotsFull: {
    color: colors.redAlert,
  },
  spotsBooked: {
    color: colors.primary,
  },
  individual: {
    ...text.hint,
    color: colors.purple,
  },
});
