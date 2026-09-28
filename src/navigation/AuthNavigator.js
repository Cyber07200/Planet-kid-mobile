import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AddChildScreen } from '../screens/auth/AddChildScreen';
import { TeacherLoginScreen } from '../screens/auth/TeacherLoginScreen';

const Stack = createNativeStackNavigator();

/**
 * Стек авторизации.
 *
 * Клиентская часть: вход по номеру и регистрация с детьми.
 * Кабинет преподавателя — отдельная ветка, как страница /teacher
 * на сайте: в неё ведёт единственная кнопка с экрана входа.
 */
export const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#FAFAFA' },
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Phone" component={PhoneScreen} />
    <Stack.Screen name="Otp" component={OtpScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="AddChild" component={AddChildScreen} />
    <Stack.Screen name="TeacherLogin" component={TeacherLoginScreen} />
  </Stack.Navigator>
);
