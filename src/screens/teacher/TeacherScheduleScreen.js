import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { refreshControl } from '../../components/ui/ListParts';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { WeekStrip } from '../../components/common/WeekStrip';
import { ParticipantsSheet } from '../../components/teacher/ParticipantsSheet';
import { describeSupabaseError } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getBookingRange } from '../../services/calendar';
import { TeacherService } from '../../services/teacher.service';
import { colors, fs, layout, s, text } from '../../theme';
import { formatSelectedDayLabel, formatTime, getIsoDay, parseDateKey } from '../../utils/date';
import { logWarn } from '../../utils/logger';

/**
 * Расписание преподавателя.
 *
 * Перенос TeacherSchedule.tsx с сайта: выбор даты и список занятий
 * с количеством записанных детей. По нажатию на занятие открывается
 * список детей, записанных на выбранную дату.
 */

const TeacherLessonCard = ({ lesson, onPress }) => (
  <Card onPress={onPress} style={styles.lessonCard}>
    <View style={styles.lessonHeader}>
      <View style={styles.lessonTitleBlock}>
        <Text style={styles.lessonName} numberOfLines={1}>
          {lesson.name}
        </Text>

        <Text style={styles.lessonType}>
          {lesson.kind === 'group' ? 'Групповое занятие' : 'Индивидуальное занятие'}
        </Text>
      </View>

      <View style={styles.timeBadge}>
        <Text style={styles.timeBadgeLabel}>{formatTime(lesson.startTime)}</Text>
      </View>
    </View>

    <View style={styles.lessonFooter}>
      <View style={styles.lessonMetaItem}>
        <Icon name="clock" size={fs(18)} color={colors.text60} />

        <Text style={styles.lessonMetaLabel}>
          {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
        </Text>
      </View>

      {/* Количество детей именно на выбранную дату */}
      <View style={styles.lessonMetaItem}>
        <Icon name="users" size={fs(18)} color={colors.text60} />

        <Text style={styles.lessonMetaLabel}>
          Записано: {lesson.participantsOnDate}
          {lesson.kind === 'group' ? ` из ${lesson.maxPlaces}` : ''}
        </Text>
      </View>
    </View>
  </Card>
);

export const TeacherScheduleScreen = () => {
  const { teacher } = useAuth();
  const teacherId = teacher?.id;

  /* Горизонт расписания — как у родителя: от сегодня на месяц вперёд */
  const range = useMemo(() => getBookingRange(), []);

  /* Выбирается дата, а не день недели: родитель записывается на дату */
  const [selectedDateKey, setSelectedDateKey] = useState(range.todayKey);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState(null);

  /* Ответ на запрос для прошлого занятия не должен перезаписать текущий список */
  const participantsRequestRef = useRef(0);

  const loadSchedule = useCallback(
    () =>
      TeacherService.getSchedule(teacherId, {
        fromDate: range.todayKey,
        toDate: range.maxDateKey,
      }),
    [range, teacherId],
  );

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadSchedule,
    [teacherId],
    { enabled: Boolean(teacherId), initialData: [] },
  );

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);

  /* Занятия выбранной даты: слот стоит на дне недели, детей считаем за эту дату */
  const lessonsForDay = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const isoDay = getIsoDay(selectedDate);

    return (data ?? [])
      .filter((lesson) => lesson.dayOfWeek === isoDay)
      .map((lesson) => ({
        ...lesson,
        participantsOnDate: lesson.bookingsByDate?.[selectedDateKey] ?? 0,
      }))
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }, [data, selectedDate, selectedDateKey]);

  /* Даты, на которые есть записи, — для отметок в ленте */
  const datesWithBookings = useMemo(() => {
    const result = new Set();

    (data ?? []).forEach((lesson) => {
      Object.entries(lesson.bookingsByDate ?? {}).forEach(([date, count]) => {
        if (count > 0) {
          result.add(date);
        }
      });
    });

    return result;
  }, [data]);

  const openLesson = async (lesson) => {
    participantsRequestRef.current += 1;
    const requestId = participantsRequestRef.current;

    setSelectedLesson(lesson);
    setParticipants([]);
    setParticipantsError(null);
    setParticipantsLoading(true);

    try {
      const result = await TeacherService.getScheduleParticipants(
        lesson.id,
        lesson.kind,
        selectedDateKey,
      );

      if (requestId === participantsRequestRef.current) {
        setParticipants(result);
      }
    } catch (loadError) {
      logWarn('teacher: список детей', loadError);

      if (requestId === participantsRequestRef.current) {
        setParticipantsError(
          describeSupabaseError(loadError, 'Не удалось загрузить список детей.'),
        );
      }
    } finally {
      if (requestId === participantsRequestRef.current) {
        setParticipantsLoading(false);
      }
    }
  };

  if (isLoading || (error && (data ?? []).length === 0)) {
    return (
      <ScreenStatus
        header={<ScreenHeader title="Расписание" />}
        loading={isLoading}
        error={error}
        onRetry={retry}
        withTabBarSpacing
      />
    );
  }

  return (
    <Screen withTabBarSpacing>
      <ScreenHeader title="Расписание" style={styles.header} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
      >
        <Text style={styles.subtitle}>Ваше расписание занятий</Text>

        <WeekStrip
          minDate={range.today}
          maxDate={range.maxDate}
          selectedDateKey={selectedDateKey}
          isMarked={(key) => datesWithBookings.has(key)}
          onSelect={setSelectedDateKey}
          style={styles.strip}
        />

        {/* Выбранный день словами: «Сегодня, 20 сентября» */}
        <Text style={styles.dateHint}>{formatSelectedDayLabel(selectedDateKey)}</Text>

        {lessonsForDay.length > 0 ? (
          <View style={styles.lessons}>
            {lessonsForDay.map((lesson) => (
              <TeacherLessonCard
                key={`${lesson.kind}-${lesson.id}`}
                lesson={lesson}
                onPress={() => openLesson(lesson)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar"
            title="На этот день занятий нет"
            description="Выберите другую дату в ленте сверху."
          />
        )}
      </ScrollView>

      <ParticipantsSheet
        lesson={selectedLesson}
        date={selectedDate}
        loading={participantsLoading}
        error={participantsError}
        participants={participants}
        onClose={() => setSelectedLesson(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: s(20),
  },
  header: {
    paddingTop: s(10),
  },
  subtitle: {
    ...text.cardBody,
    paddingHorizontal: layout.gutter,
    marginTop: s(6),
  },
  strip: {
    marginTop: s(20),
  },
  dateHint: {
    ...text.hint,
    color: colors.text60,
    paddingHorizontal: layout.gutter,
    marginTop: s(12),
  },
  lessons: {
    paddingHorizontal: layout.gutter,
    marginTop: s(16),
    gap: s(12),
  },
  lessonCard: {
    gap: s(16),
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(10),
  },
  lessonTitleBlock: {
    flexShrink: 1,
    gap: s(4),
  },
  lessonName: {
    ...text.cardTitle,
  },
  lessonType: {
    ...text.hint,
    color: colors.text60,
  },
  timeBadge: {
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.sm,
    paddingHorizontal: s(14),
    paddingVertical: s(8),
  },
  timeBadgeLabel: {
    ...text.caption,
    color: colors.primary,
  },
  lessonFooter: {
    flexDirection: 'row',
    gap: s(20),
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  lessonMetaLabel: {
    ...text.cardBody,
  },
});
