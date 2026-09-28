import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { refreshControl } from '../../components/ui/ListParts';
import { HeaderAction, ScreenHeader } from '../../components/ui/ScreenHeader';
import {
  NotificationCard,
  NotificationsEmpty,
} from '../../components/common/NotificationCard';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { InlineError, ScreenStatus } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { NotificationsService } from '../../services/notifications.service';
import { describeSupabaseError } from '../../utils/errors';
import { colors, layout, s, text } from '../../theme';
import { logWarn } from '../../utils/logger';
import {
  addDays,
  formatDateKey,
  formatMonthDay,
  getStartOfDay,
  parseDateKey,
} from '../../utils/date';

/**
 * Уведомления — макет «Notification» [0:2420] / [0:2480].
 *
 * Группировка по дням: «Сегодня», «Вчера», «Январь, 18».
 * Кнопка «Очистить все» с подтверждением из макета.
 *
 * Данные — реальные, из таблиц notifications
 * и user_notifications (их наполняет админка сайта).
 */
export const NotificationsScreen = ({ navigation }) => {
  const { user, teacher } = useAuth();

  /* Экран общий для обеих ролей: уведомления лежат
     в user_notifications и у родителя, и у преподавателя */
  const account = user ?? teacher;

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  const accountId = account?.id;

  const loadNotifications = useCallback(
    () => NotificationsService.getForUser(accountId),
    [accountId],
  );

  const { data, isLoading, isRefreshing, error, refresh, retry, setData } =
    useAsyncData(loadNotifications, [accountId], {
      enabled: Boolean(accountId),
      initialData: [],
    });

  /* Группировка по дням: «Сегодня», «Вчера», дальше — «Январь, 18» */
  const sections = useMemo(() => {
    const items = data ?? [];

    if (items.length === 0) {
      return [];
    }

    const today = getStartOfDay(new Date());
    const todayKey = formatDateKey(today);
    const yesterdayKey = formatDateKey(addDays(today, -1));

    const grouped = new Map();

    items.forEach((item) => {
      const date = item.createdAt ? new Date(item.createdAt) : today;
      const key = formatDateKey(getStartOfDay(date));

      const current = grouped.get(key) ?? [];

      current.push(item);
      grouped.set(key, current);
    });

    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, values]) => {
        let title = formatMonthDay(parseDateKey(key));

        if (key === todayKey) {
          title = 'Сегодня';
        } else if (key === yesterdayKey) {
          title = 'Вчера';
        }

        return { key, title, data: values };
      });
  }, [data]);

  const handleClearAll = async () => {
    setClearing(true);
    setClearError(null);

    try {
      await NotificationsService.clearAll(account.id);

      setData([]);
      setConfirmVisible(false);
    } catch (error) {
      setClearError(
        describeSupabaseError(error, 'Не удалось очистить уведомления'),
      );

      setConfirmVisible(false);
    } finally {
      setClearing(false);
    }
  };

  /* Прочитано помечаем сразу в интерфейсе, запрос — следом */
  const handlePressNotification = async (item) => {
    if (item.isRead) {
      return;
    }

    setData((current) =>
      (current ?? []).map((entry) =>
        entry.id === item.id ? { ...entry, isRead: true } : entry,
      ),
    );

    await NotificationsService.markAsRead(item.id, account.id).catch((markError) =>
      logWarn('notifications: прочтение', markError),
    );
  };

  if (isLoading || (error && (data ?? []).length === 0)) {
    return (
      <ScreenStatus
        header={<ScreenHeader title="Уведомления" onBack={() => navigation.goBack()} />}
        loading={isLoading}
        error={error}
        onRetry={retry}
      />
    );
  }

  const hasNotifications = (data ?? []).length > 0;

  /* Счётчик непрочитанных рядом с заголовком — как на сайте */
  const unreadCount = (data ?? []).filter((item) => !item.isRead).length;

  return (
    <Screen>
      <ScreenHeader
        title="Уведомления"
        onBack={() => navigation.goBack()}
        badge={unreadCount > 0 ? unreadCount : null}
        right={
          hasNotifications ? (
            <HeaderAction
              label="Очистить все"
              onPress={() => setConfirmVisible(true)}
            />
          ) : null
        }
      />

      <InlineError message={clearError} style={styles.clearError} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={refreshControl(isRefreshing, refresh)}
        /* Подпись под заголовком — как на сайте */
        ListHeaderComponent={
          hasNotifications ? (
            <Text style={styles.subtitle}>
              Здесь отображаются важные события и напоминания
            </Text>
          ) : null
        }
        /* Заголовок дня с линией справа — тоже как на сайте */
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              section.key === sections[0]?.key ? null : styles.sectionTitleNext,
            ]}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>

            <View style={styles.sectionLine} />
          </View>
        )}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            showTime
            onPress={() => handlePressNotification(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<NotificationsEmpty style={styles.empty} />}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Вы уверены что хотите очистить уведомления?"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmVisible(false)}
        loading={clearing}
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
    paddingTop: s(25),
    paddingBottom: s(30),
  },
  subtitle: {
    ...text.cardBody,
    color: colors.text60,
    marginBottom: s(20),
  },
  /* В макете вся лента уведомлений идёт с шагом 20 */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginBottom: s(20),
  },
  sectionTitle: {
    ...text.sectionLabel,
    flexShrink: 0,
  },
  /* Тонкая линия справа от названия дня */
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  sectionTitleNext: {
    marginTop: s(20),
  },
  separator: {
    height: s(20),
  },
  empty: {
    marginTop: s(40),
  },
  clearError: {
    marginHorizontal: layout.gutter,
    marginTop: s(10),
  },
});
