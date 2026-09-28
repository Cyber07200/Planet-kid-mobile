import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { Icon } from '../../components/ui/Icon';
import { BrandMark } from '../../components/common/BrandMark';
import { colors, fs, layout, s, text } from '../../theme';

/**
 * Вход — клиентская часть, как на сайте.
 *
 * На сайте вся клиентская авторизация идёт по номеру телефона
 * (AuthModal: «По номеру телефона» → код подтверждения, а если
 * номера нет в базе — регистрация). Логина с паролем в клиентской
 * части нет вообще.
 *
 * Кабинет преподавателя на сайте живёт на отдельной странице
 * /teacher — здесь это отдельный экран, на который ведёт
 * единственная кнопка «Войти преподавателю».
 *
 * Композиция повторяет фрейм «Authorization» из макета:
 * логотип, заголовок, сплошная кнопка, кнопка-заливка 10%
 * и ссылка внизу.
 */
export const WelcomeScreen = ({ navigation }) => {
  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <BrandMark style={styles.brand} />

      <Text style={styles.title}>Авторизация</Text>

      <Text style={styles.subtitle}>
        Войдите по номеру телефона — мы отправим код подтверждения.
      </Text>

      <View style={styles.footer}>
        <AppButton
          title="Войти по номеру"
          onPress={() => navigation.navigate('Phone', { mode: 'login' })}
          icon={<Icon name="phone" size={fs(24)} color={colors.white} />}
        />

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            У вас ещё нет аккаунта?{' '}
            <Text style={styles.linkAccent}>Зарегистрироваться</Text>
          </Text>
        </Pressable>

        <View style={styles.divider} />

        {/* Единственный вход в преподавательскую часть */}
        <AppButton
          title="Войти преподавателю"
          variant="outline"
          onPress={() => navigation.navigate('TeacherLogin')}
          icon={<Icon name="user" size={fs(24)} color={colors.primary} />}
          style={styles.teacherButton}
          textStyle={styles.teacherButtonLabel}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: s(20),
  },
  brand: {
    marginTop: s(40),
  },
  title: {
    ...text.screenTitle,
    color: colors.text90,
    textAlign: 'center',
    marginTop: s(30),
  },
  subtitle: {
    ...text.link,
    color: colors.text60,
    textAlign: 'center',
    marginTop: s(14),
    paddingHorizontal: s(20),
  },
  /* В макете кнопки занимают 360 из 500 — отступ 70 от края экрана */
  footer: {
    marginTop: 'auto',
    paddingTop: s(40),
    paddingBottom: s(20),
    paddingHorizontal: s(50),
    gap: s(10),
  },
  link: {
    alignSelf: 'center',
    marginTop: s(6),
  },
  linkText: {
    ...text.link,
    textAlign: 'center',
  },
  linkAccent: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.text10,
    marginVertical: s(16),
  },
  teacherButton: {
    height: s(56),
  },
  teacherButtonLabel: {
    fontFamily: text.sectionTitle.fontFamily,
    fontSize: fs(20),
  },
  pressed: {
    opacity: 0.85,
  },
});
