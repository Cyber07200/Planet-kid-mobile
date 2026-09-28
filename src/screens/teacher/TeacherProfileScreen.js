import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { refreshControl } from '../../components/ui/ListParts';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { AppButton } from '../../components/ui/AppButton';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useLogoutConfirm } from '../../hooks/useLogoutConfirm';
import { TeacherService } from '../../services/teacher.service';
import { getTodayKey } from '../../utils/date';
import { colors, fs, layout, s, text } from '../../theme';
import { formatMoney, getFullName, plural } from '../../utils/format';

/**
 * Профиль преподавателя — перенос TeacherProfile.tsx с сайта,
 * дополненный сводкой по расписанию и балансу,
 * чтобы экран не был пустым на телефоне.
 */
export const TeacherProfileScreen = ({ navigation }) => {
  const { teacher } = useAuth();

  const { requestLogout, dialogProps } = useLogoutConfirm();

  const teacherId = teacher?.id;

  const loadProfile = useCallback(async () => {
    /*
     * Здесь нужно только число слотов: записи ограничиваем сегодняшним
     * днём, иначе запрос тянул бы всю историю записей преподавателя.
     */
    const today = getTodayKey();

    const [profile, schedule] = await Promise.all([
      TeacherService.getProfile(teacherId),
      TeacherService.getSchedule(teacherId, { fromDate: today, toDate: today }),
    ]);

    return { profile, schedule };
  }, [teacherId]);

  const { data, isRefreshing, refresh } = useAsyncData(loadProfile, [teacherId], {
    enabled: Boolean(teacherId),
  });

  const groupCount = (data?.schedule ?? []).filter(
    (item) => item.kind === 'group',
  ).length;

  const individualCount = (data?.schedule ?? []).filter(
    (item) => item.kind === 'individual',
  ).length;

  return (
    <Screen
      scroll
      contentContainerStyle={styles.content}
      refreshControl={refreshControl(isRefreshing, refresh)}
    >
      <ScreenHeader
        title="Профиль"
        style={styles.header}
        /* Экран открывается поверх вкладок — нужна стрелка назад */
        onBack={() => navigation.goBack()}
      />

      <Card style={styles.identityCard}>
        <View style={styles.identityRow}>
          <Avatar
            uri={teacher?.avatar}
            firstName={teacher?.firstName}
            lastName={teacher?.lastName}
            size={64}
            variant="primary"
          />

          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {getFullName(teacher?.firstName, teacher?.lastName)}
            </Text>

            <Text style={styles.role}>Преподаватель</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Имя</Text>
          <Text style={styles.fieldValue}>{teacher?.firstName}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Фамилия</Text>
          <Text style={styles.fieldValue}>{teacher?.lastName || '—'}</Text>
        </View>
      </Card>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Icon name="users" size={fs(24)} color={colors.primary} />

          <Text style={styles.statValue}>{groupCount}</Text>

          <Text style={styles.statLabel}>
            {plural(groupCount, 'групповое', 'групповых', 'групповых')} занятий
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Icon name="user" size={fs(24)} color={colors.primary} />

          <Text style={styles.statValue}>{individualCount}</Text>

          <Text style={styles.statLabel}>индивидуальных слотов</Text>
        </Card>
      </View>

      <Card style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <Icon name="credit-card" size={fs(22)} color={colors.primary} />

          <View style={styles.balanceText}>
            <Text style={styles.balanceLabel}>Текущий баланс</Text>

            <Text style={styles.balanceValue}>
              {formatMoney(data?.profile?.balance ?? 0)}
            </Text>
          </View>
        </View>
      </Card>

      <Text style={styles.note}>
        Изменить данные аккаунта может администратор центра.
      </Text>

      <AppButton
        title="Выйти из аккаунта"
        variant="danger"
        size="small"
        onPress={requestLogout}
        iconRight={<Icon name="log-out" size={fs(20)} color={colors.white} />}
        style={styles.logout}
      />

      <ConfirmDialog {...dialogProps} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.gutter,
    paddingBottom: s(20),
    gap: s(16),
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: s(10),
  },
  identityCard: {
    gap: s(20),
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(16),
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(24),
    lineHeight: fs(24) * 1.2,
    color: colors.text,
  },
  role: {
    ...text.cardBody,
    marginTop: s(4),
  },
  divider: {
    height: 1,
    backgroundColor: colors.text10,
  },
  field: {
    gap: s(4),
  },
  fieldLabel: {
    ...text.hint,
    color: colors.text60,
  },
  fieldValue: {
    ...text.caption,
    color: colors.text,
  },
  stats: {
    flexDirection: 'row',
    gap: s(12),
  },
  statCard: {
    flex: 1,
    gap: s(8),
  },
  statValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(28),
    color: colors.text,
  },
  statLabel: {
    ...text.hint,
    color: colors.text60,
  },
  balanceCard: {},
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  balanceText: {
    flex: 1,
  },
  balanceLabel: {
    ...text.hint,
    color: colors.text60,
  },
  balanceValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(22),
    color: colors.text,
    marginTop: s(4),
  },
  note: {
    ...text.hint,
    color: colors.text60,
    textAlign: 'center',
  },
  logout: {
    marginTop: s(10),
  },
});
