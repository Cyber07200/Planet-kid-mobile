import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../ui/BottomSheet';
import { AppButton } from '../ui/AppButton';
import { Icon } from '../ui/Icon';
import { InlineError } from '../ui/States';
import { colors, fs, layout, s, text } from '../../theme';
import { formatTime, getRelativeDayLabel } from '../../utils/date';
import { formatMoney, stripAgeLabel } from '../../utils/format';

/**
 * Окно подтверждения разовой записи.
 *
 * По сценарию: пользователь нажал «Записаться разово» — до отправки
 * в базу показываем, что именно он покупает: занятие, направление,
 * дату, время, преподавателя, стоимость и кого записываем.
 * Отдельной строкой — что подписка не требуется.
 *
 * Оформление — собственные модальные окна проекта (BottomSheet),
 * системные alert'ы не используются.
 */
export const OnceBookingSheet = ({
  visible,
  event,
  childNames = [],
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}) => {
  if (!event) {
    return null;
  }

  const title = stripAgeLabel(event.name) || event.name;

  /* Стоимость: цена занятия × количество выбранных детей */
  const count = Math.max(childNames.length, 1);
  const price = Number(event.pricePerLesson) > 0 ? event.pricePerLesson * count : 0;

  /* Строка «поле — значение» внутри окна */
  const renderRow = (icon, label, value) =>
    value ? (
      <View style={styles.row}>
        <Icon name={icon} size={fs(18)} color={colors.text60} />

        <Text style={styles.rowLabel}>{label}</Text>

        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    ) : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      footer={
        <View style={styles.footer}>
          <AppButton
            title="Подтвердить запись"
            subtitle={price > 0 ? `К оплате ${formatMoney(price)}` : null}
            onPress={onConfirm}
            loading={loading}
            loadingTitle="Записываем..."
          />

          <AppButton
            title="Отмена"
            variant="outline"
            onPress={onCancel}
            disabled={loading}
          />
        </View>
      }
    >
      <Text style={styles.sheetTitle}>Разовая запись на занятие</Text>

      <Text style={styles.sheetSubtitle}>
        Вы покупаете занятие на один раз. Подписка не требуется.
      </Text>

      <View style={styles.card}>
        {renderRow('bookmark', 'Занятие', title)}
        {renderRow('globe', 'Направление', event.category)}
        {renderRow('calendar', 'Дата', getRelativeDayLabel(event.lessonDate))}
        {renderRow(
          'clock',
          'Время',
          `${formatTime(event.time)}${
            event.endTime ? `–${formatTime(event.endTime)}` : ''
          }`,
        )}
        {renderRow('users', 'Преподаватель', event.teacher)}
        {renderRow(
          'users',
          childNames.length > 1 ? 'Дети' : 'Ребёнок',
          childNames.join(', '),
        )}
      </View>

      {/* Стоимость отдельным блоком — это покупка */}
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Стоимость</Text>

        <Text style={styles.priceValue}>
          {price > 0 ? formatMoney(price) : 'Уточняется в центре'}
        </Text>
      </View>

      <Text style={styles.note}>
        Занятие оплачивается отдельно, в центре перед началом. Запись можно
        отменить, освободив место для других.
      </Text>

      <InlineError message={error} style={styles.error} />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetTitle: {
    ...text.sectionTitle,
    marginTop: s(6),
  },
  sheetSubtitle: {
    ...text.cardBody,
    color: colors.text60,
    marginTop: s(6),
    marginBottom: s(16),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    padding: s(16),
    gap: s(12),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  rowLabel: {
    ...text.hint,
    color: colors.text60,
    width: s(110),
  },
  rowValue: {
    ...text.caption,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary10,
    borderRadius: layout.radius.md,
    padding: s(16),
    marginTop: s(12),
  },
  priceLabel: {
    ...text.caption,
    color: colors.text80,
  },
  priceValue: {
    ...text.sectionTitle,
    color: colors.primary,
  },
  note: {
    ...text.hint,
    color: colors.text60,
    marginTop: s(12),
  },
  error: {
    marginTop: s(12),
  },
  footer: {
    gap: s(10),
  },
});
