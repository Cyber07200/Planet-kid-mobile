/**
 * Подключение настоящих файлов src к проверкам в Node.
 *
 * Запуск: node --import ./tests/setup.mjs <файл проверки>
 *
 * Раньше проверки работали с копиями модулей из src, и копии
 * успели разойтись с оригиналами. Теперь проверяется сам код
 * приложения; подменяется только клиент Supabase (база в памяти).
 */
import { register } from 'node:module';

register('./resolve-hooks.mjs', import.meta.url);

/* Хуки проверяются через act() — сообщаем React, что это тестовое окружение */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
