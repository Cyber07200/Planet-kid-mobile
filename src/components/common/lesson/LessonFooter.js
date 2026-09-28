import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../ui/AppButton';
import { Icon } from '../../ui/Icon';
import { colors, fs, layout, s, text } from '../../../theme';
import { formatTime, getRelativeDayLabel } from '../../../utils/date';
import { formatMoney } from '../../../utils/format';
import { LessonNotice } from './LessonNotice';

/**
 * Подвал окна занятия: кнопки записи, статус «Вы записаны»
 * или причина, по которой записаться нельзя.
 */
export const LessonFooter = ({
  event,
  hasSchedule,
  bookedChildren,
  availableCount,
  selectedCount,
  canBook,
  canBookOnce,
  loading,
  onBook,
  onBookOnce,
  onCancelBooking,
}) => {
  const whenLabel = `${getRelativeDayLabel(event.lessonDate)}, ${formatTime(event.time)}`;

  /* У направления может не быть слотов: карточку можно почитать, но записаться некуда */
  if (!hasSchedule) {
    return (
      <View style={styles.block}>
        <LessonNotice
          title="Расписание пока не составлено"
          description="Уточните время занятий у администратора центра."
        />
      </View>
    );
  }

  if (event.cancelled) {
    return (
      <View style={styles.block}>
        <LessonNotice
          tone="danger"
          title="Занятие отменено"
          description={event.cancellationReason || 'Запись на это занятие недоступна.'}
        />
      </View>
    );
  }

  if (bookedChildren.length > 0) {
    return (
      <View style={styles.block}>
        <View style={styles.booked}>
          <View style={styles.bookedBadge}>
            <Text style={styles.bookedLabel}>Вы записаны</Text>
            <Icon name="check" size={fs(24)} color={colors.white} />
          </View>

          <Text style={styles.bookedDate}>{whenLabel}</Text>
        </View>

        {/* Несколько записанных детей отменяются по одному в блоке «Уже записаны» */}
        {bookedChildren.length === 1 ? (
          <AppButton
            title="Отменить запись"
            variant="danger"
            onPress={() => onCancelBooking?.(bookedChildren[0].id)}
            loading={loading}
            loadingTitle="Отменяем..."
          />
        ) : null}
      </View>
    );
  }

  /*
   * Кнопку гасим только когда нажатие заведомо бессмысленно:
   * записывать некого или мест нет. В остальных случаях она
   * нажимается и показывает причину текстом.
   */
  const canPress = availableCount > 0 && event.spotsLeft > 0;

  const price = Number(event.pricePerLesson) || 0;
  const priceLabel = price > 0 ? formatMoney(price * selectedCount) : null;

  return (
    <View style={styles.block}>
      <AppButton
        title={canBook ? 'Записаться' : 'Нужна подписка'}
        subtitle={canBook ? whenLabel : null}
        iconRight={canBook ? <Icon name="chevron-right" size={fs(18)} color={colors.white} /> : null}
        onPress={onBook}
        loading={loading}
        loadingTitle="Записываем..."
        disabled={!canPress}
      />

      {onBookOnce ? (
        <>
          <AppButton
            title="Записаться разово"
            subtitle={priceLabel ? `${priceLabel} за занятие` : null}
            variant="soft"
            onPress={onBookOnce}
            loading={loading}
            loadingTitle="Записываем..."
            disabled={!canPress || !canBookOnce}
          />

          <Text style={styles.note}>
            {selectedCount > 1
              ? 'Вы покупаете по одному занятию для каждого выбранного ребёнка. Подписка не требуется.'
              : 'Вы покупаете занятие на один раз. Подписка не требуется.'}
          </Text>
        </>
      ) : null}

      <Text style={styles.note}>
        Расписание доступно для просмотра независимо от подписки. Запись доступна только на
        ближайший месяц.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: s(10),
  },
  note: {
    ...text.hint,
    fontSize: fs(11),
    color: colors.text60,
    textAlign: 'center',
  },
  booked: {
    height: s(72),
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(4),
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
  },
  bookedLabel: {
    ...text.button,
  },
  bookedDate: {
    ...text.hint,
    color: colors.white70,
  },
});
