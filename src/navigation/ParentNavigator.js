import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { FloatingTabBar } from '../components/common/FloatingTabBar';
import { HomeScreen } from '../screens/parent/HomeScreen';
import { CalendarScreen } from '../screens/parent/CalendarScreen';
import { DirectionsScreen } from '../screens/parent/DirectionsScreen';
import { NotificationsScreen } from '../screens/parent/NotificationsScreen';
import { ProfileScreen } from '../screens/parent/ProfileScreen';
import { SettingsScreen } from '../screens/parent/SettingsScreen';
import { SubscribeScreen } from '../screens/parent/SubscribeScreen';
import { UpcomingLessonsScreen } from '../screens/parent/UpcomingLessonsScreen';
import { DirectionScreen } from '../screens/parent/DirectionScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Нижняя навигация родителя — три вкладки, как в макете:
 * Главная, Календарь, Направления.
 *
 * Профиль, Уведомления, Настройки и Подписка открываются
 * поверх вкладок отдельными экранами — тоже как в макете,
 * где на них ведут кнопки из шапки.
 */
const ParentTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <FloatingTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ tabBarLabel: 'Главная', tabBarIconName: 'home' }}
    />

    <Tab.Screen
      name="Calendar"
      component={CalendarScreen}
      options={{ tabBarLabel: 'Календарь', tabBarIconName: 'calendar' }}
    />

    <Tab.Screen
      name="Directions"
      component={DirectionsScreen}
      options={{ tabBarLabel: 'Направления', tabBarIconName: 'globe' }}
    />
  </Tab.Navigator>
);

export const ParentNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="Tabs" component={ParentTabs} />

    <Stack.Screen name="Profile" component={ProfileScreen} />

    {/*
      «Ближайшие занятия» — отдельная страница поверх вкладок.
      В нижнюю панель её намеренно не добавляем: попасть сюда
      можно с главной, из блока «Ближайшие занятия».
    */}
    <Stack.Screen name="Upcoming" component={UpcomingLessonsScreen} />

    {/*
      Страница одного направления: изображение, описание
      и все его занятия с записью. Тоже вне нижней панели.
    */}
    <Stack.Screen name="Direction" component={DirectionScreen} />

    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />

    <Stack.Screen
      name="Subscribe"
      component={SubscribeScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);
