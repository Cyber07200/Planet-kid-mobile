import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '../ui/Icon';
import { BottomSheet } from '../ui/BottomSheet';
import { SchedulePill } from '../ui/DayChip';
import { colors, fs, gradients, layout, s, text } from '../../theme';
import {
  DAY_UPPER,
  formatFullDate,
  formatTime,
  getRelativeDayLabel,
  parseDateKey,
} from '../../utils/date';
import { extractAgeLabel, formatMoney, stripAgeLabel } from '../../utils/format';
import { BookedChildren, ChildPicker } from './lesson/LessonChildren';
import { LessonFooter } from './lesson/LessonFooter';
import { LessonNotice, LessonSuccess } from './lesson/LessonNotice';

/**
 * Карточка занятия с записью.
 *
 * Структура повторяет модальное окно записи с сайта
 * (CalendarPage.tsx, блок selectedEvent): картинка, метки, название
 * и дата, плитки «Время / Свободно / Стоимость», преподаватель,
 * «О занятии», расписание направления, записанные дети, выбор детей,
 * предупреждения и кнопки записи. Внешний вид — из темы приложения.
 */

const DESCRIPTION_COLLAPSE_LENGTH = 160;

const Tile = ({ icon, label, value }) => (
  <View style={styles.tile}>
    <Icon name={icon} size={fs(16)} color={colors.primary} />
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

/* Текст плитки «Свободно» — как на сайте */
const getSpotsLabel = (event) => {
  if (event.cancelled) {
    return '—';
  }

  if (event.type === 'individual') {
    return event.spotsLeft > 0 ? '1 место' : 'Занято';
  }

  return `${event.spotsLeft} из ${event.maxPlaces}`;
};

const LessonHero = ({ image, loading, onClose }) => (
  <View style={styles.hero}>
    {image ? (
      <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" />
    ) : (
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroPlaceholder}
      >
        <Icon name="calendar" size={fs(44)} color={colors.white40} />
      </LinearGradient>
    )}

    <Pressable
      onPress={onClose}
      disabled={loading}
      hitSlop={s(8)}
      style={({ pressed }) => [styles.heroClose, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Закрыть"
    >
      <Icon name="x" size={fs(18)} color={colors.white} />
    </Pressable>
  </View>
);

const LessonBadges = ({ event }) => {
  const ageLabel = extractAgeLabel(event.name);

  return (
    <View style={styles.badges}>
      {ageLabel ? <Text style={[styles.badge, styles.badgePrimary]}>{ageLabel}</Text> : null}

      {event.category ? (
        <Text style={[styles.badge, styles.badgeMuted]}>{event.category}</Text>
      ) : null}

      {event.type === 'individual' ? (
        <Text style={[styles.badge, styles.badgePurple]}>Индивидуальное</Text>
      ) : null}

      {event.cancelled ? <Text style={[styles.badge, styles.badgeDanger]}>Отменено</Text> : null}
    </View>
  );
};

const LessonDescription = ({ description }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Text style={styles.sectionTitle}>О занятии</Text>

      <Text style={styles.description} numberOfLines={expanded ? undefined : 4}>
        {description}
      </Text>

      {String(description || '').length > DESCRIPTION_COLLAPSE_LENGTH ? (
        <Pressable
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.showMoreLabel}>{expanded ? 'Скрыть' : 'Показать полностью'}</Text>

          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={fs(14)}
            color={colors.primary}
          />
        </Pressable>
      ) : null}
    </>
  );
};

export const LessonSheet = ({
  visible,
  event,
  childrenList = [],
  selectedChildIds = [],
  onToggleChild,
  onClose,
  onBook,
  onBookOnce = null,
  onCancelBooking,
  schedules = [],
  selectedScheduleId = null,
  onSelectSchedule = null,
  loading = false,
  error = null,
  success = null,
  canBook = true,
  blockReason = null,
  canBookOnce = true,
  onceBlockReason = null,
}) => {
  if (!event) {
    return null;
  }

  const bookedChildren = event.bookedChildren ?? [];
  const hasBooking = bookedChildren.length > 0;
  const hasSchedule = event.hasSchedule !== false;
  const canPick = hasSchedule && !event.cancelled && !hasBooking && event.spotsLeft > 0;

  const availableChildren = childrenList.filter(
    (child) => !event.bookedChildIds.includes(child.id),
  );

  const lessonDate = parseDateKey(event.lessonDate);
  const price = Number(event.pricePerLesson) || 0;

  const footer = (
    <LessonFooter
      event={event}
      hasSchedule={hasSchedule}
      bookedChildren={bookedChildren}
      availableCount={availableChildren.length}
      /* Сколько детей отмечено — влияет на цену разовой записи */
      selectedCount={selectedChildIds.length || 1}
      canBook={canBook}
      canBookOnce={canBookOnce}
      loading={loading}
      onBook={onBook}
      onBookOnce={onBookOnce}
      onCancelBooking={onCancelBooking}
    />
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} footer={footer}>
      <LessonHero image={event.image} loading={loading} onClose={onClose} />

      <LessonBadges event={event} />

      <Text style={styles.title}>{stripAgeLabel(event.name) || event.name}</Text>

      <Text style={styles.date}>
        {lessonDate
          ? `${getRelativeDayLabel(event.lessonDate)} · ${formatFullDate(lessonDate)}`
          : 'Дата уточняется'}
      </Text>

      <View style={styles.tiles}>
        <Tile
          icon="clock"
          label="Время"
          value={
            hasSchedule
              ? `${formatTime(event.time)}${event.endTime ? `–${formatTime(event.endTime)}` : ''}`
              : '—'
          }
        />

        <Tile icon="users" label="Свободно" value={hasSchedule ? getSpotsLabel(event) : '—'} />

        {event.duration ? (
          <Tile icon="clock" label="Длительность" value={`${event.duration} мин.`} />
        ) : null}

        {price > 0 ? <Tile icon="credit-card" label="Стоимость" value={formatMoney(price)} /> : null}
      </View>

      <View style={styles.teacherRow}>
        <View style={styles.teacherAvatar}>
          {event.teacherAvatar ? (
            <Image source={{ uri: event.teacherAvatar }} style={styles.teacherPhoto} />
          ) : (
            <Icon name="users" size={fs(18)} color={colors.text60} />
          )}
        </View>

        <View style={styles.teacherInfo}>
          <Text style={styles.tileLabel}>Преподаватель</Text>
          <Text style={styles.teacherName} numberOfLines={1}>
            {event.teacher || 'Преподаватель'}
          </Text>
        </View>
      </View>

      {/* key: при открытии другого занятия описание снова свёрнуто */}
      <LessonDescription key={event.id} description={event.description} />

      {schedules.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Расписание</Text>

          <View style={styles.schedules}>
            {schedules.slice(0, 8).map((item) => (
              <SchedulePill
                key={`${item.id}-${item.dayOfWeek}`}
                day={DAY_UPPER[item.dayOfWeek]}
                time={formatTime(item.startTime)}
                active={
                  onSelectSchedule
                    ? item.id === selectedScheduleId
                    : item.dayOfWeek === event.dayOfWeek
                }
                onPress={onSelectSchedule ? () => onSelectSchedule(item) : undefined}
              />
            ))}
          </View>
        </>
      ) : null}

      {hasBooking && !event.cancelled ? (
        <BookedChildren items={bookedChildren} loading={loading} onCancel={onCancelBooking} />
      ) : null}

      {canPick ? (
        <ChildPicker
          items={availableChildren}
          selectedIds={selectedChildIds}
          individual={event.type === 'individual'}
          loading={loading}
          onToggle={onToggleChild}
          titleStyle={styles.sectionTitle}
        />
      ) : null}

      <LessonSuccess success={success} />

      {error ? <LessonNotice tone="danger" description={error} /> : null}

      {blockReason && !hasBooking && hasSchedule && !event.cancelled ? (
        <LessonNotice
          tone={event.spotsLeft <= 0 ? 'danger' : 'warning'}
          title={event.spotsLeft <= 0 ? 'Нет свободных мест' : 'Запись недоступна'}
          description={
            onBookOnce && !onceBlockReason
              ? `${blockReason} Можно записаться разово — кнопка ниже.`
              : blockReason
          }
        />
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  /* Картинка занятия выходит за отступы листа — как на сайте */
  hero: {
    marginHorizontal: -layout.gutter,
    marginTop: -s(10),
    marginBottom: s(16),
    borderTopLeftRadius: layout.radius.lg,
    borderTopRightRadius: layout.radius.lg,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: s(176),
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    width: '100%',
    height: s(144),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroClose: {
    position: 'absolute',
    right: s(16),
    top: s(16),
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(50, 50, 50, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginBottom: s(8),
  },
  badge: {
    ...text.hint,
    borderRadius: layout.radius.pill,
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    overflow: 'hidden',
  },
  badgePrimary: {
    color: colors.primary,
    backgroundColor: colors.primary10,
  },
  badgeMuted: {
    color: colors.text60,
    backgroundColor: colors.surface,
  },
  badgePurple: {
    color: colors.purple,
    backgroundColor: 'rgba(129, 102, 228, 0.12)',
  },
  badgeDanger: {
    color: colors.redAlert,
    backgroundColor: 'rgba(255, 87, 58, 0.12)',
  },
  title: {
    ...text.sectionTitle,
  },
  date: {
    ...text.hint,
    color: colors.text60,
    marginTop: s(4),
  },
  /* Плитки — сетка по две в ряд */
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
    marginTop: s(16),
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    padding: s(12),
    gap: s(4),
  },
  tileLabel: {
    ...text.hint,
    fontSize: fs(11),
    color: colors.text60,
  },
  tileValue: {
    ...text.caption,
    color: colors.text,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    padding: s(12),
    marginTop: s(10),
  },
  teacherAvatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teacherPhoto: {
    width: '100%',
    height: '100%',
  },
  teacherInfo: {
    flexShrink: 1,
  },
  teacherName: {
    ...text.caption,
    color: colors.text,
  },
  sectionTitle: {
    ...text.sectionHeading,
    marginTop: s(18),
    marginBottom: s(8),
  },
  description: {
    ...text.cardBody,
    color: colors.text70,
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    alignSelf: 'flex-start',
    marginTop: s(8),
  },
  showMoreLabel: {
    ...text.hint,
    color: colors.primary,
  },
  schedules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
  },
  pressed: {
    opacity: 0.85,
  },
});
