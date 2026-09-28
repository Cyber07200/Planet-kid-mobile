import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { fetchWithTimeout } from '../utils/http';
import { env } from './env';

/**
 * Клиент Supabase.
 *
 * Подключаемся к тому же проекту, что и веб-версия.
 * Веб-проект не использует Supabase Auth — там своя авторизация
 * по таблице users, поэтому сессия клиента не хранится. storage
 * передаём, чтобы клиент не обращался к window.localStorage.
 *
 * Без конфигурации клиента нет: App.js в этом случае показывает
 * экран ошибки и не монтирует остальное приложение.
 */
const CLIENT_OPTIONS = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url, options) => fetchWithTimeout(url, options),
    headers: {
      'X-Client-Info': 'planet-kids-mobile',
    },
  },
};

export const supabase = env.configError
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, CLIENT_OPTIONS);
