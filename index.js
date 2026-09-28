/*
 * Точка запуска приложения.
 *
 * Полифиллы подключаются до всего остального:
 *   url-polyfill нужен клиенту Supabase (в Hermes нет URL),
 *   gesture-handler — жестам React Navigation.
 */
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

/* Регистрирует корневой компонент и на Android, и на iOS */
registerRootComponent(App);
