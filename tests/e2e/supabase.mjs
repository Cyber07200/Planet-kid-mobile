/* Подстановка клиента: вместо сети — база в памяти (fake-supabase.mjs) */
import { createFakeSupabase } from '../fake-supabase.mjs';

export const fake = createFakeSupabase({});
export const supabase = { from: (table) => fake.client.from(table) };
