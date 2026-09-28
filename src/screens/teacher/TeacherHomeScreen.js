import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { refreshControl } from '../../components/ui/ListParts';
import { Card } from '../../components/ui/Card';
import { HomeHeader, LatestNotification } from '../../components/common/HomeParts';
import { ScreenStatus } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { NotificationsService } from '../../services/notifications.service';
import { TeacherService } from '../../services/teacher.service';
import { colors, fs, gradients, layout, s, text } from '../../theme';
import {
  addDays,
  formatDateKey,
  formatTime,
  getIsoDay,
  getNextDateForDay,
  getTodayKey,
} from '../../utils/date';
import { formatMoney, plural } from '../../utils/format';
import { logWarn } from '../../utils/logger';

/**
 * Главная преподавателя — макет «Home» [0:2520].
 *
 * Это единственный экран учительской части, который есть
 * в Figma, поэтому он собран точно по макету:
 *   приветствие с аватаром + кнопка настроек
 *   синий блок «Текущий доход» с датой выплаты
 *   блок «Уведомления»
 *   список «Сегодня» с занятиями
 *   «Общая статистика»: занятий за прошлый месяц и
 *   заполняемость групп
 *
 * Остальные экраны учительской части перенесены с сайта
 * и оформлены в этом же стиле.
 */
export const TeacherHomeScreen = ({ navigation }) => {
  const { teacher } = useAuth();

  const teacherId = teacher?.id;

  const loadHome = useCallback(async () => {
    const [profile, schedule, notifications] = await Promise.all([
      TeacherService.getProfile(teacherId),
      /* Записи берём на месяц вперёд — как в расписании */
      TeacherService.getSchedule(teacherId, {
        fromDate: getTodayKey(),
        toDate: formatDateKey(addDays(new Date(), 31)),
      }),
      NotificationsService.getForUser(teacherId).catch((notificationsError) => {
        logWarn('teacher: уведомления', notificationsError);
        return [];
      }),
    ]);

    /* Статистика — дополнение: без неё главная всё равно полезна */
    const stats = await TeacherService.getStats(teacherId, schedule).catch((statsError) => {
      logWarn('teacher: статистика', statsError);
      return { lessonsLastMonth: 0, occupancy: 0 };
    });

    return { profile, schedule, stats, notifications };
  }, [teacherId]);

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadHome,
    [teacherId],
    { enabled: Boolean(teacherId) },
  );

  const todayIso = useMemo(() => getIsoDay(new Date()), []);

  const todayKey = useMemo(() => getTodayKey(), []);

  /*
   * Занятия сегодняшнего дня. Количество детей берём
   * именно на сегодняшнюю дату — родитель записывается на дату,
   * а не на «день недели вообще».
   */
  const todayLessons = useMemo(() => {
    return (data?.schedule ?? [])
      .filter((lesson) => lesson.dayOfWeek === todayIso)
      .map((lesson) => ({
        ...lesson,
        lessonDate: todayKey,
        participantsOnDate: lesson.bookingsByDate?.[todayKey] ?? 0,
      }))
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  }, [data?.schedule, todayIso, todayKey]);

  /* Если сегодня занятий нет — показываем ближайшие по датам */
  const upcomingLessons = useMemo(
    () =>
      (data?.schedule ?? [])
        .map((lesson) => {
          const date = formatDateKey(getNextDateForDay(lesson.dayOfWeek));

          return {
            ...lesson,
            lessonDate: date,
            participantsOnDate: lesson.bookingsByDate?.[date] ?? 0,
          };
        })
        .sort(
          (a, b) =>
            a.lessonDate.localeCompare(b.lessonDate) ||
            String(a.startTime).localeCompare(String(b.startTime)),
        )
        .slice(0, 3),
    [data?.schedule],
  );

  const payoutDay = data?.profile?.payoutDay1 ?? data?.profile?.payoutDay2 ?? null;

  const latestNotification = data?.notifications?.[0] ?? null;

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        loading={isLoading}
        error={error}
        onRetry={retry}
        loadingLabel="Загружаем кабинет..."
        withTabBarSpacing
      />
    );
  }

  const lessonsToShow = todayLessons.length > 0 ? todayLessons : upcomingLessons;

  return (
    <Screen
      scroll
      withTabBarSpacing
      contentContainerStyle={styles.content}
      refreshControl={refreshControl(isRefreshing, refresh)}
    >
      {/* Шестерёнка ведёт в настройки, профиль — по аватару слева */}
      <HomeHeader
        firstName={teacher?.firstName}
        lastName={teacher?.lastName}
        avatar={teacher?.avatar}
        onPressProfile={() => navigation.navigate('TeacherProfile')}
        onPressSettings={() => navigation.navigate('Settings')}
      />

      {/* Текущий доход */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.incomeCard}
      >
        <View style={styles.incomeHeader}>
          <Icon name="credit-card" size={fs(30)} color={colors.white} />
          <Text style={styles.incomeTitle}>Текущий доход</Text>
        </View>

        <Text style={styles.incomeValue}>
          {formatMoney(data?.profile?.balance ?? 0)}
        </Text>

        <View style={styles.incomeMeta}>
          <Icon name="clock" size={fs(16)} color={colors.white} />

          <Text style={styles.incomeMetaLabel}>
            {payoutDay ? `Выплата ${payoutDay} числа` : 'Дата выплаты уточняется'}
          </Text>
        </View>
      </LinearGradient>

      {/* Уведомления — как на главной у родителя */}
      <Text style={styles.sectionLabel}>Уведомления</Text>

      <LatestNotification
        notification={latestNotification}
        onPress={() => navigation.navigate('Notifications')}
      />

      {/* Занятия */}
      <Text style={styles.sectionLabel}>
        {todayLessons.length > 0 ? 'Сегодня' : 'Ближайшие занятия'}
      </Text>

      {lessonsToShow.length > 0 ? (
        <View style={styles.lessons}>
          {lessonsToShow.map((lesson) => (
            <Card
              key={`${lesson.kind}-${lesson.id}`}
              style={styles.lessonRow}
              onPress={() => navigation.navigate('TeacherSchedule')}
            >
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonName} numberOfLines={1}>
                  {lesson.name}
                </Text>

                {/* Сколько детей придёт — из реальных записей */}
                <Text style={styles.lessonCount}>
                  {lesson.participantsOnDate > 0
                    ? `Записано: ${lesson.participantsOnDate} ${plural(
                        lesson.participantsOnDate,
                        'ребёнок',
                        'ребёнка',
                        'детей',
                      )}`
                    : 'Пока никто не записался'}
                </Text>
              </View>

              <Text style={styles.lessonTime}>
                {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyText}>Занятий пока не запланировано</Text>
        </Card>
      )}

      {/* Статистика */}
      <Text style={styles.sectionLabel}>Общая статистика</Text>

      <Card style={styles.statCard}>
        <View style={styles.statRow}>
          <Text style={styles.statValue}>{data?.stats?.lessonsLastMonth ?? 0}</Text>
          <Icon name="book-open" size={fs(48)} color={colors.text} />
        </View>

        <Text style={styles.statLabel}>Занятий за прошлый месяц</Text>
      </Card>

      <Card style={styles.statCard}>
        <View style={styles.statRow}>
          <Text style={styles.statValue}>{data?.stats?.occupancy ?? 0}%</Text>
          <Icon name="bar-chart-2" size={fs(48)} color={colors.text} />
        </View>

        <Text style={styles.statLabel}>Заполняемость моих групп</Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: s(10),
    gap: s(20),
  },
  incomeCard: {
    borderRadius: layout.radius.md,
    borderTopRightRadius: layout.radius.pill,
    padding: s(20),
    gap: s(14),
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  incomeTitle: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    color: colors.white,
  },
  incomeValue: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(40),
    lineHeight: fs(40) * 1.15,
    color: colors.white80,
  },
  incomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: s(5),
  },
  incomeMetaLabel: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white,
  },
  sectionLabel: {
    ...text.sectionLabel,
  },
  lessons: {
    gap: s(20),
  },
  /* Frame 146 из макета: строка 56 в высоту, название и время */
  lessonRow: {
    minHeight: s(56),
    paddingVertical: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  lessonInfo: {
    flexShrink: 1,
    gap: s(2),
  },
  lessonCount: {
    ...text.hint,
    color: colors.text60,
  },
  lessonName: {
    ...text.cardTitle,
    flexShrink: 1,
  },
  lessonTime: {
    ...text.cardTitle,
  },
  emptyText: {
    ...text.cardBody,
    textAlign: 'center',
  },
  statCard: {
    gap: s(10),
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    ...text.stat,
  },
  statLabel: {
    ...text.cardTitle,
    color: colors.text70,
  },
  pressed: {
    opacity: 0.85,
  },
});
