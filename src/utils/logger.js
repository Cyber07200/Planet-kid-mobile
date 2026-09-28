/**
 * Диагностические сообщения только для разработки.
 *
 * В релизной сборке консоль молчит: системный лог устройства
 * читается при отладке по USB и сторонними утилитами, а в ответах
 * базы бывают телефоны и имена. Поэтому пишем лишь код и текст
 * ошибки, но никогда не весь объект запроса или ответа.
 */
const isDev =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const describe = (error) => {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  const code = error.code ? `${error.code}: ` : '';

  return `${code}${error.message ?? ''}`.trim();
};

export const logWarn = (context, error) => {
  if (!isDev) {
    return;
  }

  // eslint-disable-next-line no-console
  console.warn(`[${context}]`, describe(error) || '(пустой ответ)');
};
