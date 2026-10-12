-- Аккаунты читательниц: имя + пароль, прогресс игры, раскрасок и книг.
-- Вставить целиком в Supabase → SQL Editor → New query → Run. Можно запускать повторно.

create extension if not exists pgcrypto;
grant usage on schema public to anon;

create table if not exists public.acc_users (
  id          uuid primary key default gen_random_uuid(),
  login       text unique not null,          -- имя маленькими буквами
  display     text not null,                 -- имя как ввела читательница
  pass_hash   text not null,
  recovery    text not null,                 -- хэш кода восстановления
  fails       int not null default 0,
  locked_till timestamptz,
  data        jsonb not null default '{}'::jsonb,   -- { ключ: { v: значение, t: время } }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.acc_sessions (
  token      text primary key,
  user_id    uuid not null references public.acc_users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '365 days'
);
create table if not exists public.acc_signups (ip_hash text, at timestamptz not null default now());
create index if not exists acc_signups_ip on public.acc_signups(ip_hash, at);

alter table public.acc_users enable row level security;
alter table public.acc_sessions enable row level security;
alter table public.acc_signups enable row level security;
revoke all on public.acc_users, public.acc_sessions, public.acc_signups from anon, authenticated;

create or replace function public.acc_ip() returns text language sql stable as $$
  select md5(coalesce(
    (coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json)->>'cf-connecting-ip',
    split_part((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json)->>'x-forwarded-for', ',', 1), '') || ':oskolki')
$$;

create or replace function public.acc_new_session(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  delete from acc_sessions where user_id = p_user and expires_at < now();
  insert into acc_sessions(token, user_id) values (t, p_user);
  return t;
end $$;

create or replace function public.acc_user(p_token text) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from acc_sessions where token = p_token and expires_at > now()
$$;

-- неудачная попытка: после 10 подряд — блокировка на 15 минут
create or replace function public.acc_fail(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update acc_users set
    locked_till = case when fails + 1 >= 10 then now() + interval '15 minutes' else locked_till end,
    fails = case when fails + 1 >= 10 then 0 else fails + 1 end
  where id = p_user;
end $$;

-- Регистрация: вернёт токен входа и код восстановления (показать один раз).
create or replace function public.acc_register(p_login text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare v_disp text := btrim(p_login); v_login text := lower(btrim(p_login)); v_code text; v_id uuid;
begin
  if v_login !~ '^[a-zа-яё0-9_.\-]{3,20}$' then return json_build_object('error', 'bad_login'); end if;
  if length(coalesce(p_password, '')) < 6 then return json_build_object('error', 'short_password'); end if;
  if (select count(*) from acc_signups where ip_hash = acc_ip() and at > now() - interval '1 hour') >= 5 then
    return json_build_object('error', 'too_many'); end if;
  if exists (select 1 from acc_users where login = v_login) then return json_build_object('error', 'taken'); end if;
  v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 4) || '-' || substr(encode(gen_random_bytes(5), 'hex'), 1, 4));
  insert into acc_users(login, display, pass_hash, recovery)
    values (v_login, v_disp, crypt(p_password, gen_salt('bf', 8)), crypt(v_code, gen_salt('bf', 8))) returning id into v_id;
  insert into acc_signups(ip_hash) values (acc_ip());
  delete from acc_signups where at < now() - interval '1 day';
  return json_build_object('token', acc_new_session(v_id), 'name', v_disp, 'recovery', v_code);
end $$;

-- Вход. После 10 неудачных попыток имя блокируется на 15 минут.
create or replace function public.acc_login(p_login text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare u acc_users;
begin
  select * into u from acc_users where login = lower(btrim(p_login));
  if u.id is null then return json_build_object('error', 'wrong'); end if;
  if u.locked_till is not null and u.locked_till > now() then return json_build_object('error', 'locked'); end if;
  if u.pass_hash <> crypt(p_password, u.pass_hash) then
    perform acc_fail(u.id);
    return json_build_object('error', 'wrong');
  end if;
  update acc_users set fails = 0, locked_till = null where id = u.id;
  return json_build_object('token', acc_new_session(u.id), 'name', u.display);
end $$;

-- Новый пароль по коду восстановления. Выдаёт новый код.
create or replace function public.acc_reset(p_login text, p_code text, p_password text)
returns json language plpgsql security definer set search_path = public as $$
declare u acc_users; v_code text;
begin
  if length(coalesce(p_password, '')) < 6 then return json_build_object('error', 'short_password'); end if;
  select * into u from acc_users where login = lower(btrim(p_login));
  if u.id is null then return json_build_object('error', 'wrong'); end if;
  if u.locked_till is not null and u.locked_till > now() then return json_build_object('error', 'locked'); end if;
  if u.recovery <> crypt(upper(btrim(p_code)), u.recovery) then
    perform acc_fail(u.id);
    return json_build_object('error', 'wrong');
  end if;
  v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 4) || '-' || substr(encode(gen_random_bytes(5), 'hex'), 1, 4));
  update acc_users set pass_hash = crypt(p_password, gen_salt('bf', 8)), recovery = crypt(v_code, gen_salt('bf', 8)), fails = 0, locked_till = null where id = u.id;
  delete from acc_sessions where user_id = u.id;
  return json_build_object('token', acc_new_session(u.id), 'name', u.display, 'recovery', v_code);
end $$;

-- Прогресс: забрать всё и сохранить изменения (по каждому ключу побеждает более новая запись).
create or replace function public.acc_load(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := acc_user(p_token);
begin
  if uid is null then return json_build_object('error', 'auth'); end if;
  return (select json_build_object('name', display, 'data', data) from acc_users where id = uid);
end $$;

create or replace function public.acc_save(p_token text, p_patch jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := acc_user(p_token); cur jsonb;
begin
  if uid is null then return json_build_object('error', 'auth'); end if;
  if length(p_patch::text) > 400000 then return json_build_object('error', 'too_big'); end if;
  select data into cur from acc_users where id = uid for update;
  select coalesce(cur, '{}'::jsonb) || coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into cur
    from jsonb_each(p_patch) as e(k, v)
    where jsonb_typeof(v) = 'object' and (cur -> k is null or (v ->> 't')::bigint > coalesce((cur -> k ->> 't')::bigint, 0));
  if length(cur::text) > 2000000 then return json_build_object('error', 'too_big'); end if;
  update acc_users set data = cur, updated_at = now() where id = uid;
  return json_build_object('ok', true);
end $$;

create or replace function public.acc_logout(p_token text) returns json
language sql security definer set search_path = public as $$
  delete from acc_sessions where token = p_token returning json_build_object('ok', true)
$$;

revoke all on function public.acc_ip(), public.acc_new_session(uuid), public.acc_user(text), public.acc_fail(uuid) from public, anon;
revoke all on function public.acc_register(text, text), public.acc_login(text, text), public.acc_reset(text, text, text),
  public.acc_load(text), public.acc_save(text, jsonb), public.acc_logout(text) from public;
grant execute on function public.acc_register(text, text), public.acc_login(text, text), public.acc_reset(text, text, text),
  public.acc_load(text), public.acc_save(text, jsonb), public.acc_logout(text) to anon;
