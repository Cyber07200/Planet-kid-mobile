import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { AppButton } from '../../components/ui/AppButton';
import { InlineError } from '../../components/ui/States';
import { describeSupabaseError } from '../../utils/errors';
import { AuthService } from '../../services/auth.service';
import { layout, s } from '../../theme';
import { isValidPhone } from '../../utils/phone';

/**
 * Ввод номера телефона — макет «Authorization» [0:898].
 *
 * mode = 'login'    — вход существующего пользователя
 * mode = 'register' — подтверждение номера при регистрации
 */
export const PhoneScreen = ({ navigation, route }) => {
  const mode = route.params?.mode ?? 'login';
  const draft = route.params?.draft ?? null;

  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fullPhone = `+7 ${phone}`;

  const handleSubmit = async () => {
    setError(null);

    if (!isValidPhone(fullPhone)) {
      setError('Введите корректный номер телефона');
      return;
    }

    setLoading(true);

    try {
      let effectiveMode = mode;
      let notice = null;

      /*
       * Регистрация на уже занятый номер раньше падала
       * только в самом конце, после ввода данных детей.
       * Проверяем сразу и переводим человека во вход.
       */
      if (mode === 'register') {
        const existing = await AuthService.findUserByPhone(fullPhone);

        if (existing?.role === 'teacher') {
          setError(
            'Этот номер зарегистрирован как преподаватель. Войдите по логину и паролю.',
          );

          setLoading(false);
          return;
        }

        if (existing) {
          effectiveMode = 'login';
          notice = 'Этот номер уже зарегистрирован — выполняем вход в него.';
        }
      }

      const result = await AuthService.requestCode(fullPhone);

      navigation.navigate('Otp', {
        mode: effectiveMode,
        phone: result.phone ?? fullPhone,
        codeLength: result.codeLength,
        isTestMode: result.isTestMode,
        retryAfter: result.retryAfter,
        notice,
        draft,
      });
    } catch (requestError) {
      setError(describeSupabaseError(requestError, 'Не удалось отправить код'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Авторизация по номеру"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.body}>
        <PhoneInput value={phone} onChangeText={setPhone} autoFocus />

        <InlineError message={error} style={styles.error} />
      </View>

      <View style={styles.footer}>
        <AppButton
          title="Выслать код"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isValidPhone(fullPhone)}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: s(10),
  },
  /* В макете поле занимает 380 из 500 — отступ 60 по бокам */
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(60),
    paddingVertical: s(40),
    gap: s(20),
  },
  error: {
    marginTop: s(4),
  },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingBottom: s(20),
  },
});
