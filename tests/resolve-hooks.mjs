/**
 * Хуки загрузчика Node для файлов src:
 *
 *  - импорты без расширения ('../utils/date') дополняются '.js',
 *    как это делает Metro;
 *  - файлы src загружаются как ES-модули;
 *  - config/supabase заменяется базой в памяти (tests/e2e/supabase.mjs).
 */

const SRC_MARKER = '/src/';
const SUPABASE_STUB = new URL('./e2e/supabase.mjs', import.meta.url).href;

const isFromSrc = (context) => Boolean(context.parentURL?.includes(SRC_MARKER));

export async function resolve(specifier, context, nextResolve) {
  if (isFromSrc(context) && /(^|\/)config\/supabase$/.test(specifier)) {
    return { url: SUPABASE_STUB, shortCircuit: true };
  }

  if (isFromSrc(context) && specifier.startsWith('.') && !/\.[cm]?js$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.includes(SRC_MARKER) && url.endsWith('.js')) {
    return nextLoad(url, { ...context, format: 'module' });
  }

  return nextLoad(url, context);
}
