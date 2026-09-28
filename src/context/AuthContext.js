import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import { getFullName } from '../utils/format';
import { logWarn } from '../utils/logger';
import { isSafeId } from '../utils/validation';

/**
 * Единый контекст авторизации для обеих ролей.
 *
 * На сайте роли разнесены (родитель и учитель хранятся
 * под разными ключами), здесь логика собрана в одном месте,
 * чтобы навигация однозначно решала, какую часть интерфейса открыть.
 */

const PARENT_STORAGE_KEY = 'planet-kids-auth';
const TEACHER_STORAGE_KEY = 'planet-kids-teacher-session';

export const ROLES = {
  PARENT: 'parent',
  TEACHER: 'teacher',
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }

  return context;
};

/*
 * На устройстве храним минимум, нужный для мгновенного запуска:
 * телефон, дети и подписка каждый раз берутся из базы и
 * в незашифрованное хранилище не попадают.
 */
const pickStoredFields = (data) => ({
  id: data.id,
  name: data.name,
  firstName: data.firstName ?? null,
  lastName: data.lastName ?? null,
  avatar: data.avatar ?? null,
  role: data.role,
});

const saveSession = (key, data) =>
  AsyncStorage.setItem(key, JSON.stringify(pickStoredFields(data))).catch((error) =>
    logWarn('auth', error),
  );

const clearSessions = () =>
  AsyncStorage.multiRemove([PARENT_STORAGE_KEY, TEACHER_STORAGE_KEY]).catch(() => {});

/** Сохранённая сессия нужной роли или null, если она битая */
const readSession = async (key, role) => {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');

    if (parsed && isSafeId(parsed.id) && parsed.role === role) {
      return parsed;
    }
  } catch (error) {
    logWarn('auth', error);
  }

  await AsyncStorage.removeItem(key).catch(() => {});

  return null;
};

/**
 * Полный профиль родителя: пользователь + дети + активная подписка.
 * Аналог buildUserData из веб-версии.
 */
const buildParentData = async (userId) => {
  const profile = await UsersService.getProfile(userId);

  if (!profile) {
    return null;
  }

  const [children, subscription] = await Promise.all([
    UsersService.getChildren(userId),
    UsersService.getActiveSubscription(userId),
  ]);

  return {
    id: profile.id,
    name: getFullName(profile.firstName, profile.lastName) || 'Пользователь',
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    avatar: profile.avatar,
    points: profile.bonusPoints ?? 0,
    children,
    subscription,
    subscriptionActive: Boolean(subscription),
    subscriptionDate: subscription?.endDate ?? null,
    role: ROLES.PARENT,
  };
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);

  /* Онбординг показываем только сразу после регистрации */
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const signInParent = useCallback((data) => {
    saveSession(PARENT_STORAGE_KEY, data);
    setUser(data);
    setTeacher(null);
    setRole(ROLES.PARENT);
  }, []);

  const signOutLocally = useCallback(() => {
    setUser(null);
    setTeacher(null);
    setRole(null);
    setNeedsOnboarding(false);
  }, []);

  /* Восстановление сессии при запуске */
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const savedTeacher = await readSession(TEACHER_STORAGE_KEY, ROLES.TEACHER);

      if (savedTeacher) {
        if (!cancelled) {
          setTeacher(savedTeacher);
          setRole(ROLES.TEACHER);
        }

        return;
      }

      const savedParent = await readSession(PARENT_STORAGE_KEY, ROLES.PARENT);

      if (!savedParent || cancelled) {
        return;
      }

      /* Сохранённое показываем сразу, чтобы не держать пользователя на сплэше */
      setUser(savedParent);
      setRole(ROLES.PARENT);

      try {
        const fresh = await buildParentData(savedParent.id);

        if (cancelled) {
          return;
        }

        if (fresh) {
          signInParent(fresh);
        } else {
          /* Пользователя удалили из базы — выходим */
          await clearSessions();
          signOutLocally();
        }
      } catch (error) {
        /* Нет сети — остаёмся на сохранённых данных, обновятся позже */
        logWarn('auth', error);
      }
    };

    restoreSession()
      .catch(async (error) => {
        logWarn('auth', error);
        await clearSessions();
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [signInParent, signOutLocally]);

  const loginParent = useCallback(
    async (phone) => {
      const found = await AuthService.findUserByPhone(phone);

      /* Номера нет в базе — вызывающий экран предложит регистрацию */
      if (!found) {
        return null;
      }

      if (found.role === ROLES.TEACHER) {
        throw new Error(
          'Этот номер зарегистрирован как преподаватель. Используйте вход для преподавателя.',
        );
      }

      if (!found.isActive) {
        throw new Error('Аккаунт отключён. Обратитесь к администратору центра.');
      }

      const data = await buildParentData(found.id);

      if (data) {
        signInParent(data);
      }

      return data;
    },
    [signInParent],
  );

  const registerParent = useCallback(
    async (payload) => {
      const userId = await AuthService.registerParent(payload);
      const data = await buildParentData(userId);

      if (!data) {
        throw new Error('Не удалось загрузить созданного пользователя');
      }

      setNeedsOnboarding(true);
      signInParent(data);

      return data;
    },
    [signInParent],
  );

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  const userId = user?.id;

  const refreshUser = useCallback(async () => {
    if (!userId) {
      return null;
    }

    const fresh = await buildParentData(userId);

    if (!fresh) {
      await clearSessions();
      signOutLocally();
      return null;
    }

    signInParent(fresh);

    return fresh;
  }, [signInParent, signOutLocally, userId]);

  const loginTeacher = useCallback(async ({ name, password }) => {
    const session = await AuthService.loginTeacher({ name, password });

    saveSession(TEACHER_STORAGE_KEY, session);
    setTeacher(session);
    setUser(null);
    setRole(ROLES.TEACHER);

    return session;
  }, []);

  const logout = useCallback(async () => {
    await clearSessions();
    signOutLocally();
  }, [signOutLocally]);

  const value = useMemo(
    () => ({
      isLoading,
      role,
      user,
      teacher,
      needsOnboarding,
      loginParent,
      registerParent,
      loginTeacher,
      completeOnboarding,
      refreshUser,
      logout,
    }),
    [
      isLoading,
      role,
      user,
      teacher,
      needsOnboarding,
      loginParent,
      registerParent,
      loginTeacher,
      completeOnboarding,
      refreshUser,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
