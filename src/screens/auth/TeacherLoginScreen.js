import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppInput } from '../../components/ui/AppInput';
import { AppButton } from '../../components/ui/AppButton';
import { BrandMark } from '../../components/common/BrandMark';
import { InlineError } from '../../components/ui/States';
import { describeSupabaseError } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { colors, layout, s, text } from '../../theme';

/**
 * Кабинет преподавателя — отдельный вход, как на сайте (/teacher):
 * имя и фамилия плюс пароль. Пароль проверяет сервер
 * (см. AuthService.loginTeacher); на «нет такого преподавателя»
 * и «неверный пароль» ответ одинаковый, чтобы не раскрывать имена.
 *
 * Оформление — фрейм «Authorization» из макета: логотип,
 * заголовок, поля с заливкой 20% и сплошная кнопка внизу.
 */
export const TeacherLoginScreen = ({ navigation }) => {
  const { loginTeacher } = useAuth();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setError(null);

    const fullName = name.trim();

    if (!fullName) {
      setError('Введите имя и фамилию');
      return;
    }

    if (!password) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);

    try {
      await loginTeacher({ name: fullName, password });

      /*
       * Роль в контексте сменилась на teacher — корневая
       * навигация сама переключит стек на кабинет.
       */
    } catch (loginError) {
      setError(describeSupabaseError(loginError, 'Не удалось выполнить вход'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <ScreenHeader title="Назад" onBack={() => navigation.goBack()} />

      <BrandMark style={styles.brand} />

      <Text style={styles.title}>Кабинет преподавателя</Text>

      <Text style={styles.subtitle}>Введите имя, фамилию и пароль</Text>

      <View style={styles.form}>
        <AppInput
          label="Имя и фамилия:"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(null);
          }}
          placeholder="Иван Иванов"
          autoCapitalize="words"
          textContentType="username"
          maxLength={100}
        />

        <AppInput
          label="Пароль:"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          placeholder="Введите пароль"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          maxLength={200}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <InlineError message={error} />
      </View>

      <View style={styles.footer}>
        <AppButton
          title={loading ? 'Вход...' : 'Войти'}
          onPress={handleSubmit}
          loading={loading}
        />

        <Text style={styles.note}>
          Пароль выдаёт администратор центра. Родителям — вход по номеру
          телефона на предыдущем экране.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: s(10),
  },
  brand: {
    marginTop: s(20),
  },
  title: {
    ...text.screenTitle,
    color: colors.text90,
    textAlign: 'center',
    marginTop: s(24),
  },
  subtitle: {
    ...text.link,
    color: colors.text60,
    textAlign: 'center',
    marginTop: s(10),
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
  note: {
    ...text.hint,
    color: colors.text60,
    textAlign: 'center',
  },
});
