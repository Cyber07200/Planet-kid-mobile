import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppButton } from '../../components/ui/AppButton';
import { ConfirmDialog } from '../../components/ui/BottomSheet';
import { useLogoutConfirm } from '../../hooks/useLogoutConfirm';
import { useAuth } from '../../context/AuthContext';
import { env } from '../../config/env';
import { colors, fs, layout, s, text } from '../../theme';

/**
 * Настройки — макет «Notification» [0:2451].
 *
 * Разделы «Главное», «Конфиденциальность», «Персональное»
 * повторяют SettingsPage.tsx с сайта.
 */

/*
 * Адреса поддержки и документов берутся из .env
 * (EXPO_PUBLIC_SUPPORT_URL / EXPO_PUBLIC_POLICY_URL / EXPO_PUBLIC_TERMS_URL).
 * Пока они не заданы, приложение не ведёт в никуда,
 * а показывает контакты центра текстом.
 */
const CENTER_CONTACT =
  'Напишите администратору центра или обратитесь лично по адресу Ясная 14к2.';

const Row = ({ label, right, onPress, highlighted = false }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.row,
      highlighted ? styles.rowHighlighted : null,
      pressed ? styles.pressed : null,
    ]}
    accessibilityRole="button"
  >
    <Text
      style={[styles.rowLabel, highlighted ? styles.rowLabelHighlighted : null]}
      numberOfLines={2}
    >
      {label}
    </Text>

    {right}
  </Pressable>
);

/**
 * Экран общий для родителя и преподавателя.
 *
 * У преподавателя нет подписки и бонусных баллов, поэтому эти
 * строки просто не показываются — отдельный экран-дубль
 * для этого не нужен.
 */
export const SettingsScreen = ({ navigation }) => {
  const { requestLogout, dialogProps } = useLogoutConfirm();

  const { teacher } = useAuth();

  const isTeacher = Boolean(teacher);

  const openLink = async (url, title, fallbackMessage) => {
    if (!url) {
      Alert.alert(title, fallbackMessage);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        return;
      }

      Alert.alert(title, fallbackMessage);
    } catch (error) {
      Alert.alert(title, fallbackMessage);
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader title="Настройки" onBack={() => navigation.goBack()} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Главное</Text>

        {/* Баллы есть только у родителя */}
        {isTeacher ? null : (
          <Row
            label="Оставить отзыв"
            onPress={() =>
              Alert.alert(
                'Оставить отзыв',
                'Расскажите о занятиях администратору центра — за отзыв начисляется 25 баллов.',
              )
            }
            right={
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusLabel}>+25 баллов</Text>
              </View>
            }
          />
        )}

        <Row
          label="Написать в поддержку"
          onPress={() =>
            openLink(env.supportUrl, 'Написать в поддержку', CENTER_CONTACT)
          }
          right={
            <Icon name="message-circle" size={fs(24)} color={colors.text80} />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Конфиденциальность</Text>

        <Row
          label="Политика работы центра"
          onPress={() =>
            openLink(
              env.policyUrl,
              'Политика работы центра',
              'Документ можно запросить у администратора центра.',
            )
          }
          right={
            <Icon name="arrow-up-right" size={fs(26)} color={colors.text80} />
          }
        />

        <Row
          label="Условия использования"
          onPress={() =>
            openLink(
              env.termsUrl,
              'Условия использования',
              'Документ можно запросить у администратора центра.',
            )
          }
          right={
            <Icon name="arrow-up-right" size={fs(26)} color={colors.text80} />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Персональное</Text>

        {/* Подписка — только для родителя */}
        {isTeacher ? null : (
          <Row
            label="Подобрать подписку"
            highlighted
            onPress={() => navigation.navigate('Subscribe')}
            right={
              <Icon name="arrow-up-right" size={fs(26)} color={colors.white} />
            }
          />
        )}

        <Row
          label={isTeacher ? 'Мой профиль' : 'Профиль и дети'}
          onPress={() =>
            navigation.navigate(isTeacher ? 'TeacherProfile' : 'Profile')
          }
          right={<Icon name="user" size={fs(24)} color={colors.text80} />}
        />
      </View>

      <AppButton
        title="Выйти из аккаунта"
        variant="danger"
        size="small"
        onPress={requestLogout}
        style={styles.logout}
      />

      <ConfirmDialog {...dialogProps} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: s(30),
  },
  section: {
    paddingHorizontal: layout.gutter,
    marginTop: s(24),
    gap: s(12),
  },
  sectionTitle: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(20),
    color: colors.text,
  },
  row: {
    minHeight: s(70),
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: s(20),
    paddingVertical: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
  },
  rowHighlighted: {
    backgroundColor: colors.primary,
  },
  rowLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(20),
    color: colors.text80,
    flex: 1,
  },
  rowLabelHighlighted: {
    color: colors.white,
  },
  bonusBadge: {
    backgroundColor: colors.orange,
    borderRadius: layout.radius.md,
    paddingHorizontal: s(16),
    paddingVertical: s(8),
  },
  bonusLabel: {
    fontFamily: text.cardBody.fontFamily,
    fontSize: fs(15),
    color: colors.white,
  },
  logout: {
    marginTop: s(30),
    marginHorizontal: layout.gutter,
  },
  pressed: {
    opacity: 0.85,
  },
});
