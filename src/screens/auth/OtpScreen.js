import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/ui/Icon';

import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { OtpInput } from '../../components/ui/OtpInput';
import { InlineError } from '../../components/ui/States';
import { describeSupabaseError } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import { AuthService } from '../../services/auth.service';
import { colors, fs, layout, s, text } from '../../theme';
import { formatPhoneForDisplay } from '../../utils/phone';
import { plural } from '../../utils/format';

/**
 * Ввод кода из смс — макет «Authorization» [0:871] / [0:975].
 *
 * При входе: код верный → ищем пользователя.
 *   найден      → входим;
 *   не найден   → отправляем на регистрацию с этим номером.
 *
 * При регистрации: код верный → переходим к добавлению детей
 * и создаём аккаунт на последнем шаге.
 */
export const OtpScreen = ({ navigation, route }) => {
  const {
    mode = 'login',
    phone,
    codeLength = 4,
    isTestMode = false,
    retryAfter = 60,
    notice = null,
    draft = null,
  } = route.params ?? {};

  const { loginParent } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { seconds, isFinished, restart } = useCountdown(retryAfter);

  const busy = loading || resending;

  useEffect(() => {
    setError(null);
  }, [code]);

  const handleVerify = async (value = code) => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await AuthService.verifyCode(phone, value);

      if (!isValid) {
        setError(
          isTestMode
            ? 'Неверный код. Пока SMS не подключены, используйте 1234'
            : 'Неверный код подтверждения',
        );

        setLoading(false);
        return;
      }

      if (mode === 'register') {
        /*
         * Номер подтверждён. Дальше добавляем детей
         * и только потом создаём аккаунт — так же, как на сайте.
         */
        navigation.navigate('AddChild', { draft: { ...draft, phone } });

        setLoading(false);
        return;
      }

      const user = await loginParent(phone);

      if (!user) {
        /* Номера нет в базе — предлагаем зарегистрироваться */
        navigation.navigate('Register', { phone, phoneVerified: true });
      }

      /* При успехе навигация переключится сама: роль изменилась */
    } catch (verifyError) {
      setError(describeSupabaseError(verifyError, 'Не удалось выполнить вход'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isFinished || busy) {
      return;
    }

    setCode('');
    setError(null);
    setResending(true);

    try {
      const result = await AuthService.requestCode(phone);

      restart(result.retryAfter ?? 60);
    } catch (resendError) {
      setError(describeSupabaseError(resendError, 'Не удалось отправить код'));

      if (resendError?.retryAfter) {
        restart(resendError.retryAfter);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <ScreenHeader title="Назад" onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <Text style={styles.title}>Введите код из смс</Text>

        <OtpInput
          value={code}
          onChangeText={setCode}
          length={codeLength}
          onComplete={handleVerify}
          error={Boolean(error)}
        />

        <Text style={styles.hint}>
          Код отправлен на {formatPhoneForDisplay(phone)}
        </Text>

        {notice ? (
          <View style={[styles.notice, styles.noticeInfo]}>
            <Icon name="info" size={fs(18)} color={colors.primary} />

            <Text style={[styles.noticeText, styles.noticeInfoText]}>
              {notice}
            </Text>
          </View>
        ) : null}

        {isTestMode ? (
          <View style={styles.notice}>
            <Icon name="info" size={fs(18)} color={colors.orangeDeep} />

            <Text style={styles.noticeText}>
              Отправка SMS ещё не подключена к проекту, поэтому сообщение
              не придёт. Для входа используйте код 1234. Как включить
              настоящие SMS — в supabase/README.md.
            </Text>
          </View>
        ) : null}

        <InlineError message={error} />
      </View>

      {/*
        В макете внизу одна кнопка: пока идёт отсчёт — «Выслать код
        повторно (59 секунд)» приглушённым цветом, после отсчёта —
        активная, а во время проверки кода — «Обработка».
        Код проверяется сам, как только введена последняя цифра.
      */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleResend}
          disabled={busy || !isFinished}
          style={({ pressed }) => [
            styles.resend,
            busy || !isFinished ? styles.resendMuted : null,
            pressed && isFinished && !busy ? styles.pressed : null,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !isFinished }}
        >
          <Text style={styles.resendLabel}>
            {loading
              ? 'Обработка'
              : resending
                ? 'Отправляем...'
                : 'Выслать код повторно'}
          </Text>

          {!busy && !isFinished ? (
            <Text style={styles.resendTimer}>
              ({seconds} {plural(seconds, 'секунда', 'секунды', 'секунд')})
            </Text>
          ) : null}
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: s(10),
  },
  /* В макете блок с кодом занимает 360 из 500 — отступ 70 по бокам */
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(70),
    paddingVertical: s(40),
    gap: s(10),
  },
  title: {
    ...text.screenTitle,
    color: colors.text90,
    textAlign: 'center',
    marginBottom: s(10),
  },
  hint: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(16),
    color: colors.text70,
    textAlign: 'center',
    marginTop: s(10),
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    backgroundColor: 'rgba(255, 179, 58, 0.15)',
    borderRadius: layout.radius.md,
    padding: s(14),
  },
  noticeText: {
    ...text.hint,
    color: colors.orangeDeep,
    flex: 1,
  },
  noticeInfo: {
    backgroundColor: colors.primary10,
  },
  noticeInfoText: {
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingBottom: s(20),
  },
  /* Frame 187 из макета: 460x59, радиус 20 */
  resend: {
    minHeight: s(59),
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(10),
  },
  resendMuted: {
    backgroundColor: colors.primary80,
  },
  resendLabel: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(24),
    lineHeight: fs(24) * 1.15,
    color: colors.white,
  },
  resendTimer: {
    fontFamily: text.caption.fontFamily,
    fontSize: fs(15),
    color: colors.white80,
    marginTop: s(4),
  },
  pressed: {
    opacity: 0.85,
  },
});
