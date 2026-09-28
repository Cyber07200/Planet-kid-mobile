/**
 * fetch с ограничением по времени.
 *
 * Без таймаута запрос на плохой мобильной сети может висеть минутами,
 * а экран — показывать бесконечную загрузку. Прерванный запрос
 * отдаёт AbortError, который describeSupabaseError переводит
 * в понятное «Нет соединения с сервером».
 */
export const REQUEST_TIMEOUT_MS = 15000;

export const fetchWithTimeout = (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  /* Внешний signal (его передаёт supabase-js) тоже должен срабатывать */
  options.signal?.addEventListener?.('abort', () => controller.abort(), { once: true });

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
};

/** Тело ответа как JSON или null, если это не JSON */
export const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
