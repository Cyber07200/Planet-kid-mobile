import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { FloatingTabBar } from '../components/common/FloatingTabBar';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherScheduleScreen } from '../screens/teacher/TeacherScheduleScreen';
import { TeacherBalanceScreen } from '../screens/teacher/TeacherBalanceScreen';
import { TeacherProfileScreen } from '../screens/teacher/TeacherProfileScreen';
import { NotificationsScreen } from '../screens/parent/NotificationsScreen';
import { SettingsScreen } from '../screens/parent/SettingsScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Преподавательская часть.
 *
 * Внизу три вкладки: Главная, Расписание, Баланс.
 * Профиль в панель не выносим — он открывается по нажатию
 * на аватар на главной или из настроек, как и просили.
 *
 * Уведомления и настройки открываются поверх вкладок —
 * как у родителя, и читают те же таблицы: преподаватель
 * в базе такой же пользователь, просто с ролью teacher.
 */
const TeacherTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <FloatingTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
    }}
  >
    <Tab.Screen
      name="TeacherHome"
      component={TeacherHomeScreen}
      options={{ tabBarLabel: 'Главная', tabBarIconName: 'home' }}
    />

    <Tab.Screen
      name="TeacherSchedule"
      component={TeacherScheduleScreen}
      options={{ tabBarLabel: 'Расписание', tabBarIconName: 'calendar' }}
    />

    <Tab.Screen
      name="TeacherBalance"
      component={TeacherBalanceScreen}
      options={{ tabBarLabel: 'Баланс', tabBarIconName: 'credit-card' }}
    />
  </Tab.Navigator>
);

export const TeacherNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="TeacherTabs" component={TeacherTabs} />

    {/* Профиль преподавателя — отдельным экраном поверх вкладок */}
    <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />

    <Stack.Screen name="Notifications" component={NotificationsScreen} />

    {/* Те же настройки, что у родителя, но без подписки и баллов */}
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);
