import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';

import { colors, fs, layout, s, text } from '../../theme';
import { AppButton } from './AppButton';
import { Screen } from './Screen';

/**
 * Состояния загрузки / пустоты / ошибки.
 *
 * Вынесены в отдельный файл, чтобы каждый экран
 * показывал их одинаково.
 */

export const LoadingState = ({ label = 'Загружаем...', style }) => (
  <View style={[styles.center, style]}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingLabel}>{label}</Text>
  </View>
);

export const EmptyState = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => (
  <View style={[styles.center, styles.block, style]}>
    <View style={styles.iconCircle}>
      <Icon name={icon} size={fs(28)} color={colors.primary} />
    </View>

    <Text style={styles.title}>{title}</Text>

    {description ? <Text style={styles.description}>{description}</Text> : null}

    {actionLabel && onAction ? (
      <AppButton
        title={actionLabel}
        onPress={onAction}
        size="small"
        fullWidth={false}
        style={styles.action}
      />
    ) : null}
  </View>
);

export const ErrorState = ({
  title = 'Не удалось загрузить данные',
  description,
  onRetry,
  style,
}) => (
  <View style={[styles.center, styles.block, style]}>
    <View style={[styles.iconCircle, styles.iconCircleError]}>
      <Icon name="alert-circle" size={fs(28)} color={colors.redAlert} />
    </View>

    <Text style={styles.title}>{title}</Text>

    {description ? <Text style={styles.description}>{description}</Text> : null}

    {onRetry ? (
      <AppButton
        title="Повторить"
        onPress={onRetry}
        size="small"
        fullWidth={false}
        style={styles.action}
      />
    ) : null}
  </View>
);

/**
 * Экран целиком занят загрузкой или ошибкой первой загрузки.
 * Шапку экран передаёт свою, чтобы с неё можно было уйти назад.
 */
export const ScreenStatus = ({
  header,
  loading,
  error,
  onRetry,
  loadingLabel,
  withTabBarSpacing = false,
}) => (
  <Screen withTabBarSpacing={withTabBarSpacing}>
    {header}
    {loading ? (
      <LoadingState label={loadingLabel} />
    ) : (
      <ErrorState description={error} onRetry={onRetry} />
    )}
  </Screen>
);

/**
 * Компактная плашка ошибки — для случаев, когда часть
 * данных загрузилась, а часть нет.
 */
export const InlineError = ({ message, style }) => {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.inline, style]}>
      <Icon name="alert-circle" size={fs(18)} color={colors.redAlert} />
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
};

export const InlineSuccess = ({ message, style }) => {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.inline, styles.inlineSuccess, style]}>
      <Icon name="check-circle" size={fs(18)} color={colors.primary} />
      <Text style={[styles.inlineText, styles.inlineSuccessText]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(40),
    paddingHorizontal: layout.gutter,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    marginHorizontal: layout.gutter,
  },
  iconCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(16),
  },
  iconCircleError: {
    backgroundColor: 'rgba(255, 87, 58, 0.12)',
  },
  title: {
    ...text.cardTitle,
    textAlign: 'center',
  },
  description: {
    ...text.cardBody,
    textAlign: 'center',
    marginTop: s(8),
    maxWidth: s(360),
  },
  loadingLabel: {
    ...text.cardBody,
    marginTop: s(14),
  },
  action: {
    marginTop: s(18),
    paddingHorizontal: s(24),
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    backgroundColor: 'rgba(255, 87, 58, 0.08)',
    borderRadius: layout.radius.sm,
    padding: s(14),
  },
  inlineText: {
    ...text.caption,
    color: colors.redAlert,
    flex: 1,
  },
  inlineSuccess: {
    backgroundColor: colors.primary10,
  },
  inlineSuccessText: {
    color: colors.primary,
  },
});
