// Вход преподавателя: «Имя Фамилия» + пароль.
//
// Хеш пароля читается здесь, с service_role, и никогда не уходит
// на устройство. После развёртывания функции закройте клиентскому
// ключу чтение users.password_hash (см. supabase/README.md).

import bcrypt from 'npm:bcryptjs@3';

import { createAdminClient, json, readRequest } from '../_shared/http.ts';

const NAME_MAX_LENGTH = 100;
const PASSWORD_MAX_LENGTH = 200;

// Один и тот же ответ для «нет такого» и «неверный пароль»,
// чтобы перебором нельзя было узнать имена сотрудников.
const INVALID = { error: 'Неверное имя или пароль' };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

Deno.serve(async (request) => {
  const parsed = await readRequest(request);

  if ('response' in parsed) {
    return parsed.response;
  }

  const name = String(parsed.body.name ?? '').replace(/\s+/g, ' ').trim();
  const password = String(parsed.body.password ?? '');
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');

  if (
    !firstName ||
    !lastName ||
    !password ||
    name.length > NAME_MAX_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return json(INVALID, 401);
  }

  const supabase = createAdminClient();

  const { data: matches, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar, password_hash, is_active')
    .eq('role', 'teacher')
    .ilike('first_name', escapeLike(firstName))
    .ilike('last_name', escapeLike(lastName))
    .limit(2);

  if (error) {
    console.error('teacher-login: ошибка чтения users', error.code);
    return json({ error: 'Внутренняя ошибка' }, 500);
  }

  if (matches && matches.length > 1) {
    return json(
      {
        error:
          'Найдено несколько преподавателей с таким именем. Обратитесь к администратору центра.',
      },
      409,
    );
  }

  const teacher = matches?.[0];

  const passwordValid = teacher?.password_hash
    ? await bcrypt.compare(password, teacher.password_hash)
    : false;

  if (!teacher || !passwordValid) {
    return json(INVALID, 401);
  }

  if (!teacher.is_active) {
    return json({ error: 'Ваш аккаунт деактивирован' }, 403);
  }

  return json({
    teacher: {
      id: teacher.id,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      avatar: teacher.avatar ?? null,
    },
  });
});
