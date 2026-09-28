import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenModule from 'expo-splash-screen';
import { useFonts } from 'expo-font';

/*
 * Шрифты подключаем по одному начертанию: импорт из корня пакета
 * тянет в сборку все начертания семейства (36 файлов вместо 8).
 */
import { Comfortaa_400Regular } from '@expo-google-fonts/comfortaa/400Regular';
import { Comfortaa_500Medium } from '@expo-google-fonts/comfortaa/500Medium';
import { Comfortaa_600SemiBold } from '@expo-google-fonts/comfortaa/600SemiBold';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa/700Bold';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';

import { env } from './src/config/env';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

/* Держим нативный сплэш, пока не загрузятся шрифты */
SplashScreenModule.preventAutoHideAsync().catch(() => {});

/**
 * Точка входа.
 *
 * Пока грузятся шрифты Comfortaa и Montserrat (они задают
 * весь визуальный стиль макета), держим нативный сплэш.
 */
export default function App() {
  /* Шрифты макета: Comfortaa для интерфейса, Montserrat для полей */
  const [fontsLoaded, fontError] = useFonts({
    Comfortaa_400Regular,
    Comfortaa_500Medium,
    Comfortaa_600SemiBold,
    Comfortaa_700Bold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  /* Первый кадр отрисован — можно убирать нативный сплэш */
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreenModule.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  /* Шрифты ещё грузятся — ничего не рисуем, виден нативный сплэш */
  if (!fontsLoaded && !fontError) {
    return null;
  }

  /* Нет ключей Supabase — понятный экран вместо белого */
  if (env.configError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer} onLayout={onLayoutRootView}>
          <Text style={styles.errorTitle}>Не удалось запустить приложение</Text>
          <Text style={styles.errorText}>{env.configError}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />

        {/* AuthProvider хранит роль и сессию, RootNavigator по ней выбирает стек */}
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text70,
    textAlign: 'center',
  },
});
