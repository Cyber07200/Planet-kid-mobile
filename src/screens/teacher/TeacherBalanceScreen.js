import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { refreshControl } from '../../components/ui/ListParts';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState, ScreenStatus } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { TeacherService } from '../../services/teacher.service';
import { colors, fs, gradients, layout, s, text } from '../../theme';
import { formatDotDate } from '../../utils/date';
import { formatMoney } from '../../utils/format';

/**
 * Баланс преподавателя — перенос TeacherBalance.tsx с сайта:
 * текущий баланс, суммы «выплачено» и «ожидает выплаты»,
 * история выплат из таблицы teacher_payouts.
 */

const STATUS_LABELS = {
  paid: 'Выплачено',
  pending: 'Ожидает',
  processing: 'В обработке',
  cancelled: 'Отменено',
};

export const TeacherBalanceScreen = () => {
  const { teacher } = useAuth();

  const teacherId = teacher?.id;

  const loadBalance = useCallback(async () => {
    const [profile, payouts] = await Promise.all([
      TeacherService.getProfile(teacherId),
      TeacherService.getPayouts(teacherId),
    ]);

    return { profile, payouts };
  }, [teacherId]);

  const { data, isLoading, isRefreshing, error, refresh, retry } = useAsyncData(
    loadBalance,
    [teacherId],
    { enabled: Boolean(teacherId) },
  );

  const totals = useMemo(() => {
    const payouts = data?.payouts ?? [];

    const paid = payouts
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + item.amount, 0);

    const pending = payouts
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0);

    return { paid, pending };
  }, [data?.payouts]);

  if (isLoading || (error && !data)) {
    return (
      <ScreenStatus
        header={<ScreenHeader title="Баланс" />}
        loading={isLoading}
        error={error}
        onRetry={retry}
        withTabBarSpacing
      />
    );
  }

  return (
    <Screen
      scroll
      withTabBarSpacing
      contentContainerStyle={styles.content}
      refreshControl={refreshControl(isRefreshing, refresh)}
    >
      <ScreenHeader title="Баланс" style={styles.header} />

      <Text style={styles.subtitle}>Ваши начисления и выплаты</Text>

      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <View>
            <Text style={styles.balanceLabel}>Текущий баланс</Text>

            <Text style={styles.balanceValue}>
              {formatMoney(data?.profile?.balance ?? 0)}
            </Text>
          </View>

          <View style={styles.walletIcon}>
            <Icon name="credit-card" size={fs(26)} color={colors.white} />
          </View>
        </View>

        {data?.profile?.payoutDay1 ? (
          <View style={styles.balanceMeta}>
            <Icon name="clock" size={fs(16)} color={colors.white} />

            <Text style={styles.balanceMetaLabel}>
              Выплаты {data.profile.payoutDay1}
              {data.profile.payoutDay2 ? ` и ${data.profile.payoutDay2}` : ''} числа
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.totals}>
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Выплачено</Text>
          <Text style={styles.totalValue}>{formatMoney(totals.paid)}</Text>
        </Card>

        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Ожидает выплаты</Text>
          <Text style={styles.totalValue}>{formatMoney(totals.pending)}</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>История выплат</Text>

      {(data?.payouts ?? []).length > 0 ? (
        <View style={styles.payouts}>
          {data.payouts.map((payout) => (
            <Card key={payout.id} style={styles.payoutRow}>
              <View style={styles.payoutInfo}>
                <Text style={styles.payoutTitle}>Выплата</Text>

                <Text style={styles.payoutDate}>
                  {payout.paidAt
                    ? formatDotDate(new Date(payout.paidAt))
                    : formatDotDate(new Date(payout.createdAt))}
                </Text>
              </View>

              <View style={styles.payoutMeta}>
                <Text style={styles.payoutAmount}>{formatMoney(payout.amount)}</Text>

                <Text
                  style={[
                    styles.payoutStatus,
                    payout.status === 'paid' ? styles.payoutStatusPaid : null,
                  ]}
                >
                  {STATUS_LABELS[payout.status] ?? payout.status}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="arrow-down-left"
          title="Выплат пока нет"
          description="Здесь появится история начислений и выплат."
        />
      )}
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
    marginBottom: s(20),
  },
  balanceCard: {
    marginHorizontal: layout.gutter,
    borderRadius: layout.radius.lg,
    padding: s(24),
    gap: s(16),
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white80,
  },
  balanceValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(38),
    lineHeight: fs(38) * 1.15,
    color: colors.white,
    marginTop: s(8),
  },
  walletIcon: {
    width: s(48),
    height: s(48),
    borderRadius: layout.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  balanceMetaLabel: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white,
  },
  totals: {
    flexDirection: 'row',
    gap: s(12),
    paddingHorizontal: layout.gutter,
    marginTop: s(16),
  },
  totalCard: {
    flex: 1,
    gap: s(8),
  },
  totalLabel: {
    ...text.cardBody,
  },
  totalValue: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(22),
    color: colors.text,
  },
  sectionTitle: {
    ...text.sectionTitle,
    paddingHorizontal: layout.gutter,
    marginTop: s(28),
    marginBottom: s(14),
  },
  payouts: {
    paddingHorizontal: layout.gutter,
    gap: s(10),
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(10),
  },
  payoutInfo: {
    gap: s(4),
  },
  payoutTitle: {
    ...text.caption,
    color: colors.text,
  },
  payoutDate: {
    ...text.hint,
    color: colors.text60,
  },
  payoutMeta: {
    alignItems: 'flex-end',
    gap: s(4),
  },
  payoutAmount: {
    ...text.caption,
    color: colors.text,
  },
  payoutStatus: {
    ...text.hint,
    color: colors.text60,
  },
  payoutStatusPaid: {
    color: colors.primary,
  },
});
