// Общие помощники Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

// Предварительные проверки запроса: CORS, метод и JSON-тело.
// Возвращает либо готовый ответ, либо разобранное тело.
export const readRequest = async (
  request: Request,
): Promise<{ response: Response } | { body: Record<string, unknown> }> => {
  if (request.method === 'OPTIONS') {
    return { response: new Response('ok', { headers: CORS_HEADERS }) };
  }

  if (request.method !== 'POST') {
    return { response: json({ error: 'Метод не поддерживается' }, 405) };
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      throw new Error('empty body');
    }

    return { body };
  } catch {
    return { response: json({ error: 'Некорректный запрос' }, 400) };
  }
};

// Клиент с service_role: ключ живёт только в окружении функции.
export const createAdminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export const normalizePhone = (raw: unknown) => {
  const digits = String(raw ?? '').replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
};

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

// Сравнение строк за постоянное время — ответ не выдаёт,
// сколько символов хеша совпало.
export const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
};
