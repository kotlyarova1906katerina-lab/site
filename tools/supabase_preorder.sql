-- Счётчик «Жду книгу» на главной: одна отметка на аккаунт читательницы.
-- Нужны таблицы аккаунтов из supabase_accounts.sql (они уже есть в базе).
-- Вставить целиком в Supabase → SQL Editor → New query → Run. Можно запускать повторно.

create table if not exists public.preorder_waits (
  user_id    uuid primary key references public.acc_users(id) on delete cascade,  -- один аккаунт = одна отметка
  created_at timestamptz not null default now()
);
alter table public.preorder_waits enable row level security;
revoke all on public.preorder_waits from anon, authenticated;

-- сколько человек ждут книгу (видно всем)
create or replace function public.preorder_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from preorder_waits
$$;

-- отметиться: {added: true/false, count: N} или {error: "auth"}
create or replace function public.preorder_wait(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := acc_user(p_token); n int;
begin
  if uid is null then return json_build_object('error', 'auth'); end if;
  insert into preorder_waits(user_id) values (uid) on conflict do nothing;
  get diagnostics n = row_count;
  return json_build_object('added', n > 0, 'count', (select count(*) from preorder_waits));
end $$;

-- отмечалась ли уже эта читательница
create or replace function public.preorder_me(p_token text) returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('voted', exists(select 1 from preorder_waits where user_id = acc_user(p_token)))
$$;

revoke all on function public.preorder_count(), public.preorder_wait(text), public.preorder_me(text) from public;
grant execute on function public.preorder_count(), public.preorder_wait(text), public.preorder_me(text) to anon;
