import bcrypt from 'bcryptjs';

import { env } from '../config/env';
import { supabase } from '../config/supabase';
import { fetchWithTimeout, readJson } from '../utils/http';
import { logWarn } from '../utils/logger';
import { formatPhoneForDatabase, isValidPhone } from '../utils/phone';
import {
  cleanGender,
  cleanName,
  escapeLikePattern,
  isValidBirthDate,
  isValidName,
} from '../utils/validation';
import { OTP_MODES, OtpService } from './otp.service';
import { USER_FIELDS, mapUser } from './mappers';

/**
 * Авторизация и регистрация — механика веб-версии.
 *
 *  РОДИТЕЛЬ — вход по номеру телефона + код подтверждения.
 *  УЧИТЕЛЬ  — вход по «Имя Фамилия» + пароль (bcrypt-хеш в users).
 */

/*
 * Одинаковый ответ на «нет такого преподавателя» и «неверный пароль»:
 * иначе по разным текстам можно перебором выяснить имена сотрудников.
 */
const INVALID_CREDENTIALS = 'Неверное имя или пароль';

const PASSWORD_MAX_LENGTH = 200;

const toTeacherSession = (row) => ({
  id: row.id,
  firstName: row.first_name ?? row.firstName,
  lastName: row.last_name ?? row.lastName,
  avatar: row.avatar ?? null,
  role: 'teacher',
});

/**
 * Проверка пароля на сервере (Edge Function `teacher-login`).
 *
 * @returns сессия преподавателя или null, если функция не развёрнута
 */
const loginTeacherOnServer = async (name, password) => {
  const response = await fetchWithTimeout(`${env.supabaseUrl}/functions/v1/teacher-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    body: JSON.stringify({ name, password }),
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await readJson(response);

  if (!response.ok || !payload?.teacher?.id) {
    throw new Error(
      typeof payload?.error === 'string' ? payload.error : INVALID_CREDENTIALS,
    );
  }

  return toTeacherSession(payload.teacher);
};

/**
 * Прежняя проверка на устройстве — пока `teacher-login` не развёрнута.
 *
 * Ей нужен доступ к users.password_hash по публичному ключу, поэтому
 * после развёртывания функции этот доступ нужно закрыть
 * (см. supabase/README.md, раздел «Безопасность»).
 */
const loginTeacherOnDevice = async (firstName, lastName, password) => {
  const { data: matches, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar, password_hash, role, is_active')
    .eq('role', 'teacher')
    .ilike('first_name', escapeLikePattern(firstName))
    .ilike('last_name', escapeLikePattern(lastName))
    .limit(2);

  if (error) {
    throw error;
  }

  if (matches?.length > 1) {
    throw new Error(
      'Найдено несколько преподавателей с таким именем. Обратитесь к администратору центра.',
    );
  }

  const teacher = matches?.[0];

  if (!teacher?.password_hash || !(await bcrypt.compare(password, teacher.password_hash))) {
    throw new Error(INVALID_CREDENTIALS);
  }

  /* О блокировке сообщаем только после верного пароля */
  if (!teacher.is_active) {
    throw new Error('Ваш аккаунт деактивирован');
  }

  return toTeacherSession(teacher);
};

const prepareChildren = (children, parentId) =>
  children
    .filter((child) => isValidName(child.firstName) && isValidBirthDate(child.birthDate))
    .map((child) => ({
      parent_id: parentId,
      first_name: cleanName(child.firstName),
      last_name: cleanName(child.lastName) || null,
      birth_date: child.birthDate,
      gender: cleanGender(child.gender),
    }));

export const AuthService = {
  /** Отправка кода подтверждения; режим выбирает OtpService */
  async requestCode(phone) {
    const result = await OtpService.sendCode(phone);

    return {
      phone: result.phone,
      codeLength: result.codeLength,
      retryAfter: result.retryAfter,
      /* true — SMS реально не отправляется, нужен тестовый код */
      isTestMode: result.mode === OTP_MODES.DEV,
    };
  },

  async verifyCode(phone, code) {
    return OtpService.verifyCode(phone, code);
  },

  /**
   * Поиск пользователя по номеру.
   * null — номера ещё нет, экран предложит регистрацию.
   */
  async findUserByPhone(phone) {
    if (!isValidPhone(phone)) {
      throw new Error('Введите корректный номер телефона');
    }

    const { data, error } = await supabase
      .from('users')
      .select(USER_FIELDS)
      .eq('phone', formatPhoneForDatabase(phone))
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapUser(data);
  },

  /** Создание родителя вместе с детьми — как AuthContext.register на сайте */
  async registerParent({ phone, firstName, lastName, children = [] }) {
    if (!isValidName(firstName)) {
      throw new Error('Введите имя');
    }

    if (await this.findUserByPhone(phone)) {
      throw new Error('Пользователь с таким номером уже существует');
    }

    const { data: createdUser, error: userError } = await supabase
      .from('users')
      .insert({
        phone: formatPhoneForDatabase(phone),
        first_name: cleanName(firstName),
        last_name: cleanName(lastName) || null,
        is_phone_verified: true,
        is_active: true,
        role: 'parent',
      })
      .select('id')
      .single();

    if (userError) {
      throw userError;
    }

    if (!createdUser) {
      throw new Error('Пользователь не был создан');
    }

    const childrenToInsert = prepareChildren(children, createdUser.id);

    if (childrenToInsert.length > 0) {
      const { error: childrenError } = await supabase
        .from('children')
        .insert(childrenToInsert);

      if (childrenError) {
        throw childrenError;
      }
    }

    return createdUser.id;
  },

  /**
   * Вход преподавателя: «Имя Фамилия» (регистронезависимо) + пароль.
   */
  async loginTeacher({ name, password }) {
    const fullName = cleanName(name);
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ');

    if (!firstName || !lastName) {
      throw new Error('Введите имя и фамилию');
    }

    if (!password) {
      throw new Error('Введите пароль');
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new Error(INVALID_CREDENTIALS);
    }

    const session = await loginTeacherOnServer(fullName, password);

    if (session) {
      return session;
    }

    logWarn('auth', 'teacher-login не развёрнута — пароль проверяется на устройстве');

    return loginTeacherOnDevice(firstName, lastName, password);
  },
};
