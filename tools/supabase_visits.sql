-- Счётчик посещений сайта: сколько людей заходит, на какие страницы и откуда (ВК, TikTok, Telegram…).
-- Личных данных нет: только случайный номер устройства, страница, источник и время.
-- Вставить целиком в Supabase → SQL Editor → New query → Run. Можно запускать повторно.
-- В конце запрос покажет пароль для страницы статистики (…/site/stats/).

create extension if not exists pgcrypto;

create table if not exists public.site_visits (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  visitor text not null,        -- случайный номер устройства из браузера
  path    text not null,        -- страница сайта
  src     text                  -- откуда пришли: ВКонтакте, TikTok, Telegram…
);
create index if not exists site_visits_at on public.site_visits(at);
create index if not exists site_visits_vp on public.site_visits(visitor, path, at);
alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

create table if not exists public.site_stats_key (k text primary key);
alter table public.site_stats_key enable row level security;
revoke all on public.site_stats_key from anon, authenticated;
insert into public.site_stats_key select encode(gen_random_bytes(5), 'hex') where not exists (select 1 from public.site_stats_key);

-- отметить заход; повтор той же страницы тем же устройством в течение 30 минут не считается
create or replace function public.visit_log(p_visitor text, p_path text, p_src text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or p_visitor !~ '^[a-z0-9-]{8,40}$' or p_path is null or length(p_path) > 120 then return; end if;
  if exists (select 1 from site_visits where visitor = p_visitor and path = p_path and at > now() - interval '30 minutes') then return; end if;
  insert into site_visits(visitor, path, src) values (p_visitor, p_path, nullif(left(coalesce(p_src, ''), 40), ''));
end $$;

-- статистика для страницы …/site/stats/ (только с паролем)
create or replace function public.visit_stats(p_key text, p_days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  d int := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := (now() at time zone 'Europe/Moscow')::date;
  since timestamptz := ((today - (d - 1))::timestamp at time zone 'Europe/Moscow');
begin
  if not exists (select 1 from site_stats_key where k = p_key) then return json_build_object('error', 'key'); end if;
  return json_build_object(
    'today',  (select count(distinct visitor) from site_visits where at >= (today::timestamp at time zone 'Europe/Moscow')),
    'week',   (select count(distinct visitor) from site_visits where at >= ((today - 6)::timestamp at time zone 'Europe/Moscow')),
    'month',  (select count(distinct visitor) from site_visits where at >= ((today - 29)::timestamp at time zone 'Europe/Moscow')),
    'all',    (select count(distinct visitor) from site_visits),
    'views',  (select count(*) from site_visits where at >= since),
    'waits',  (select count(*) from preorder_waits),
    'users',  (select count(*) from acc_users),
    'days',   (select coalesce(json_agg(x order by x.day), '[]'::json) from (
                 select to_char(g::date, 'YYYY-MM-DD') as day,
                        count(distinct v.visitor) as visitors, count(v.id) as views
                 from generate_series(today - (d - 1), today, interval '1 day') g
                 left join site_visits v on (v.at at time zone 'Europe/Moscow')::date = g::date
                 group by g) x),
    'pages',  (select coalesce(json_agg(x), '[]'::json) from (
                 select path, count(distinct visitor) as visitors, count(*) as views
                 from site_visits where at >= since group by path order by 2 desc, 3 desc limit 20) x),
    'sources',(select coalesce(json_agg(x), '[]'::json) from (
                 select coalesce(src, 'Прямой заход') as src, count(distinct visitor) as visitors
                 from site_visits where at >= since group by 1 order by 2 desc limit 12) x)
  );
end $$;

revoke all on function public.visit_log(text, text, text), public.visit_stats(text, int) from public;
grant execute on function public.visit_log(text, text, text), public.visit_stats(text, int) to anon;

select k as "Пароль для страницы статистики" from public.site_stats_key;
