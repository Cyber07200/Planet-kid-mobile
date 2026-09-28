import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { AppInput } from '../../components/ui/AppInput';
import { AppButton } from '../../components/ui/AppButton';
import { BrandMark } from '../../components/common/BrandMark';
import { InlineError } from '../../components/ui/States';
import { colors, layout, s, text } from '../../theme';

/**
 * Регистрация — макет «Registration» [0:1200].
 *
 * Поля: Логин (имя и фамилия), Пароль, Повторите пароль.
 * Состояние ошибки «Пароли не совпадают» тоже из макета.
 *
 * Функционально повторяет форму регистрации сайта:
 * пароль там проверяется на длину и совпадение, но в базу
 * не записывается — вход родителя идёт по номеру телефона.
 */
export const RegisterScreen = ({ navigation, route }) => {
  const presetPhone = route.params?.phone ?? null;
  const phoneVerified = route.params?.phoneVerified ?? false;

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const validate = () => {
    const nextErrors = {};

    const parts = login.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      nextErrors.login = 'Введите имя';
    }

    if (!password) {
      nextErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      nextErrors.password = 'Пароль должен содержать минимум 6 символов';
    }

    if (password && password !== passwordConfirm) {
      nextErrors.passwordConfirm =
        'Пароли не совпадают, пожалуйста проверьте правильность написанного!';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    const parts = login.trim().split(/\s+/);

    const draft = {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
      phone: presetPhone,
    };

    if (presetPhone && phoneVerified) {
      /* Номер уже подтверждён на предыдущем шаге */
      navigation.navigate('AddChild', { draft });
      return;
    }

    navigation.navigate('Phone', {
      mode: 'register',
      draft,
      phone: presetPhone ? presetPhone.replace(/^\+7\s?/, '') : '',
    });
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <BrandMark style={styles.brand} />

      <Text style={styles.title}>Регистрация</Text>

      <View style={styles.form}>
        <AppInput
          label="Логин:"
          value={login}
          onChangeText={setLogin}
          placeholder="Иван Иванов"
          autoCapitalize="words"
          error={errors.login}
          textContentType="name"
          maxLength={100}
        />

        <AppInput
          label="Пароль:"
          value={password}
          onChangeText={setPassword}
          placeholder="Минимум 6 символов"
          secureTextEntry
          autoCapitalize="none"
          error={errors.password}
          textContentType="newPassword"
        />

        <AppInput
          label="Повторите пароль:"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="Повторите пароль"
          secureTextEntry
          autoCapitalize="none"
          error={errors.passwordConfirm}
          textContentType="newPassword"
        />

        <InlineError message={formError} />
      </View>

      <View style={styles.footer}>
        <AppButton title="Зарегистрироваться" onPress={handleSubmit} />

        <Pressable
          onPress={() => navigation.navigate('Welcome')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            У вас уже есть аккаунт? <Text style={styles.linkAccent}>Войти</Text>
          </Text>
        </Pressable>
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
    marginTop: s(10),
  },
  title: {
    ...text.screenTitle,
    color: colors.text90,
    textAlign: 'center',
    marginTop: s(30),
  },
  form: {
    marginTop: s(36),
    gap: s(20),
  },
  /* В макете кнопка занимает 360 из 500 — отступ 70 от края экрана */
  footer: {
    marginTop: 'auto',
    paddingTop: s(30),
    paddingBottom: s(20),
    paddingHorizontal: s(50),
    gap: s(16),
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    ...text.link,
    textAlign: 'center',
  },
  linkAccent: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
