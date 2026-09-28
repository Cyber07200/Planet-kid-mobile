import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../ui/Icon';
import { colors, fs, layout, s, text } from '../../../theme';

/**
 * Цветные плашки окна занятия: предупреждение, ошибка, успех.
 */

const TONES = {
  warning: {
    box: { backgroundColor: 'rgba(255, 179, 58, 0.15)' },
    color: colors.orangeDeep,
  },
  danger: {
    box: { backgroundColor: 'rgba(255, 87, 58, 0.1)' },
    color: colors.redAlert,
  },
};

export const LessonNotice = ({ tone = 'warning', title, description }) => {
  const { box, color } = TONES[tone] ?? TONES.warning;

  return (
    <View style={[styles.notice, box]}>
      <Icon name="alert-circle" size={fs(16)} color={color} />

      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color }]}>{title}</Text> : null}

        {description ? <Text style={[styles.text, { color }]}>{description}</Text> : null}
      </View>
    </View>
  );
};

/*
 * Успешная запись — зелёная плашка с текстом сайта:
 * «Ребёнок успешно записан!» и «Занятие добавлено в расписание…».
 */
export const LessonSuccess = ({ success }) => {
  if (!success) {
    return null;
  }

  const isText = typeof success === 'string';

  return (
    <View style={[styles.notice, styles.success]}>
      <View style={styles.successIcon}>
        <Icon name="check" size={fs(16)} color={colors.white} />
      </View>

      <View style={styles.body}>
        <Text style={styles.successTitle}>{isText ? 'Готово' : success.title}</Text>
        <Text style={styles.successText}>{isText ? success : success.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(8),
    borderRadius: layout.radius.md,
    padding: s(12),
    marginTop: s(16),
  },
  body: {
    flex: 1,
    gap: s(2),
  },
  title: {
    ...text.caption,
  },
  text: {
    ...text.hint,
  },
  success: {
    backgroundColor: 'rgba(100, 246, 81, 0.15)',
  },
  successIcon: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: '#2FA84F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...text.caption,
    color: '#1F7A38',
  },
  successText: {
    ...text.hint,
    color: '#2F7A46',
  },
});
