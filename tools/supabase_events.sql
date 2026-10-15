-- Что делают на сайте: главы игры, концовки, тест, раскраски, песни, книги, серии, переходы в соцсети.
-- Личных данных нет: случайный номер устройства, раздел, действие, подробность, время.
-- Нужен скрипт supabase_visits.sql (пароль статистики берётся оттуда).
-- Вставить целиком в Supabase → SQL Editor → New query → Run. Можно запускать повторно.

create table if not exists public.site_events (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  visitor text not null,
  section text not null,      -- igra, test, raskraska, music, knigi, serial, link
  action  text not null,      -- start, finish, ending, route, quit, result, play, open, chapter, click…
  detail  text                -- «Глава 3», «Артур», название кадра, книги, серии…
);
create index if not exists site_events_at on public.site_events(at);
create index if not exists site_events_v on public.site_events(visitor, at);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;

-- записать действие; то же самое действие того же устройства в течение 5 минут не повторяется, не больше 500 в сутки
create or replace function public.event_log(p_visitor text, p_section text, p_action text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or p_visitor !~ '^[a-z0-9-]{8,40}$' or p_section !~ '^[a-z_]{2,20}$' or p_action !~ '^[a-z_]{2,20}$' then return; end if;
  p_detail := nullif(left(coalesce(p_detail, ''), 80), '');
  if exists (select 1 from site_events where visitor = p_visitor and section = p_section and action = p_action
             and detail is not distinct from p_detail and at > now() - interval '5 minutes') then return; end if;
  if (select count(*) from site_events where visitor = p_visitor and at > now() - interval '1 day') >= 500 then return; end if;
  insert into site_events(visitor, section, action, detail) values (p_visitor, p_section, p_action, p_detail);
end $$;

-- сводка для страницы статистики: по каждому разделу, действию и подробности — сколько людей и сколько раз
create or replace function public.event_stats(p_key text, p_days int default 30) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  d int := least(greatest(coalesce(p_days, 30), 1), 365);
  since timestamptz := ((((now() at time zone 'Europe/Moscow')::date - (d - 1))::timestamp) at time zone 'Europe/Moscow');
begin
  if not exists (select 1 from site_stats_key where k = p_key) then return json_build_object('error', 'key'); end if;
  return (select coalesce(json_agg(x), '[]'::json) from (
    select section, action, detail, count(distinct visitor) as people, count(*) as times
    from site_events where at >= since
    group by section, action, detail order by section, action, people desc limit 3000) x);
end $$;

revoke all on function public.event_log(text, text, text, text), public.event_stats(text, int) from public;
grant execute on function public.event_log(text, text, text, text), public.event_stats(text, int) to anon;
