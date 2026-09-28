-- Коды подтверждения телефона.
--
-- Таблица нужна собственному SMS-шлюзу (Edge Functions
-- send-sms-code / verify-sms-code). Сам код в базе не хранится —
-- только его SHA-256 хеш вместе с солью, поэтому даже при доступе
-- к таблице код восстановить нельзя.

create table if not exists public.phone_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text        not null,
  code_hash   text        not null,
  salt        text        not null,
  attempts    integer     not null default 0,
  verified    boolean     not null default false,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists phone_codes_phone_idx
  on public.phone_codes (phone, created_at desc);

create index if not exists phone_codes_expires_idx
  on public.phone_codes (expires_at);

-- Таблица обслуживается только Edge Function'ами (service_role).
-- Клиентскому ключу доступ закрыт: коды не должны читаться из приложения.
alter table public.phone_codes enable row level security;

drop policy if exists "phone_codes_no_public_access" on public.phone_codes;

create policy "phone_codes_no_public_access"
  on public.phone_codes
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Чистка просроченных кодов.
create or replace function public.cleanup_phone_codes()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.phone_codes
  where expires_at < now() - interval '1 day';
$$;

comment on table public.phone_codes is
  'Одноразовые коды подтверждения телефона. Пишется только из Edge Functions.';
