import React, { useCallback, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthNavigator } from './AuthNavigator';
import { ParentNavigator } from './ParentNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { ROLES, useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    text: colors.text,
    border: colors.text10,
  },
};

/**
 * Корневая навигация.
 *
 * Роль определяется в AuthContext после входа
 * и решает, какой стек показать:
 *   не авторизован → экраны входа и регистрации
 *   parent         → пользовательская часть
 *   teacher        → преподавательская часть
 *
 * Преподаватель не может случайно попасть в интерфейс
 * родителя и наоборот — стеки не пересекаются.
 */
export const RootNavigator = () => {
  const { isLoading, role, needsOnboarding } = useAuth();

  const [splashDone, setSplashDone] = useState(false);

  /* Стабильная ссылка: иначе таймер заставки перезапускался бы на каждом рендере */
  const finishSplash = useCallback(() => setSplashDone(true), []);

  if (!splashDone || isLoading) {
    return <SplashScreen onFinish={finishSplash} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {role === ROLES.TEACHER ? (
          <Stack.Screen name="Teacher" component={TeacherNavigator} />
        ) : role === ROLES.PARENT ? (
          needsOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <Stack.Screen name="Main" component={ParentNavigator} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
