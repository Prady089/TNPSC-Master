-- TNPSC Group 1 Prep - database schema (Supabase / Postgres)
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- ───────────────────────── Profiles (student details) ─────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  phone            text,
  district         text,
  education        text,               -- highest qualification
  target_year      int,                -- exam year aiming for
  attempt_number   int default 1,      -- how many times attempted before
  preferred_lang   text default 'en' check (preferred_lang in ('en','ta')),
  daily_goal       int  default 20,    -- questions per day
  role             text default 'student',   -- student | admin | superadmin (check added below)
  chat_muted_until timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Create a profile row automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Upgrades for databases created before the superadmin / chat release.
alter table public.profiles add column if not exists chat_muted_until timestamptz;
-- Which TNPSC exam the student is preparing for: g1 = Group 1, g2 = Group 2/2A, g4 = Group 4 (and 3).
alter table public.profiles add column if not exists target_group text;
alter table public.profiles alter column target_group drop default;  -- new students must choose
alter table public.profiles drop constraint if exists profiles_target_group_check;
alter table public.profiles add constraint profiles_target_group_check check (target_group in ('g1','g2','g4'));
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','admin','superadmin'));

-- admin = reviews questions and moderates chat; superadmin = also manages members and exam dates.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'));
$$;
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin');
$$;

-- ───────────────────────── Question bank ─────────────────────────
create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  unit_code     text not null,                 -- GS1..GS6, APT, RSN, CA
  chapter_id    text,                          -- e.g. c12-pol-01 (null for news/PYQ)
  news_id       uuid,
  question      text not null,
  options       jsonb not null check (jsonb_array_length(options) = 4),
  answer_index  int  not null check (answer_index between 0 and 3),
  explanation   text,
  source_page   int,
  difficulty    int  default 2 check (difficulty between 1 and 3),
  source        text not null default 'book' check (source in ('book','news','pyq','manual')),
  status        text not null default 'draft' check (status in ('draft','approved','rejected')),
  lang          text default 'en',
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz default now()
);
create index if not exists questions_unit_status on public.questions (unit_code, status);
create index if not exists questions_chapter on public.questions (chapter_id) where status = 'approved';

-- Daily quiz: the same set for every student on a given date (built by the cron job).
create table if not exists public.daily_quiz (
  quiz_date     date primary key,
  question_ids  uuid[] not null,
  created_at    timestamptz default now()
);

-- ───────────────────────── Attempts & scores ─────────────────────────
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  mode          text not null check (mode in ('daily','unit','chapter','mock','revise')),
  quiz_date     date,                  -- for daily
  unit_code     text,
  chapter_id    text,
  total         int not null,
  correct       int not null,
  duration_sec  int,
  created_at    timestamptz default now()
);
create index if not exists attempts_user on public.quiz_attempts (user_id, created_at desc);
-- One scored daily attempt per student per day.
create unique index if not exists attempts_daily_once on public.quiz_attempts (user_id, quiz_date) where mode = 'daily';

create table if not exists public.attempt_answers (
  attempt_id     uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  selected_index int,                  -- null = skipped
  is_correct     boolean not null,
  primary key (attempt_id, question_id)
);

-- Per-unit accuracy for the signed-in student (RLS of underlying tables applies).
create or replace view public.my_unit_stats with (security_invoker = true) as
select q.unit_code,
       count(*)                                   as answered,
       count(*) filter (where a.is_correct)       as correct
from public.attempt_answers a
join public.quiz_attempts t on t.id = a.attempt_id
join public.questions q     on q.id = a.question_id
where t.user_id = auth.uid()
group by q.unit_code;

-- ───────────────────────── Reading progress & bookmarks ─────────────────────────
create table if not exists public.reading_progress (
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  chapter_id  text not null,
  progress    real not null default 0,      -- 0..1
  bookmarked  boolean not null default false,
  updated_at  timestamptz default now(),
  primary key (user_id, chapter_id)
);

-- ───────────────────────── Current affairs ─────────────────────────
create table if not exists public.news_items (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  title         text not null,
  url           text not null unique,
  published_at  timestamptz,
  summary       text,          -- our own 2-3 line summary (never the article text)
  exam_angle    text,          -- why it matters for TNPSC
  tags          text[] default '{}',
  is_relevant   boolean default true,
  created_at    timestamptz default now()
);
create index if not exists news_published on public.news_items (published_at desc);

-- ───────────────────────── Row level security ─────────────────────────
alter table public.profiles          enable row level security;
alter table public.questions         enable row level security;
alter table public.daily_quiz        enable row level security;
alter table public.quiz_attempts     enable row level security;
alter table public.attempt_answers   enable row level security;
alter table public.reading_progress  enable row level security;
alter table public.news_items        enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "admin reads profiles" on public.profiles;
create policy "own profile read"     on public.profiles for select using (id = auth.uid());
create policy "admin reads profiles" on public.profiles for select using (public.is_admin());
create policy "own profile update"   on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Only a superadmin (or the SQL editor / service key) can change roles or chat mutes.
create or replace function public.protect_role() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_superadmin() and
     (new.role is distinct from old.role or new.chat_muted_until is distinct from old.chat_muted_until) then
    raise exception 'role can only be changed by a super admin';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

drop policy if exists "approved questions readable" on public.questions;
drop policy if exists "admin manages questions"     on public.questions;
create policy "approved questions readable" on public.questions for select using (status = 'approved' or public.is_admin());
create policy "admin manages questions"     on public.questions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "daily quiz readable" on public.daily_quiz;
create policy "daily quiz readable" on public.daily_quiz for select using (true);

drop policy if exists "own attempts" on public.quiz_attempts;
create policy "own attempts" on public.quiz_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own answers" on public.attempt_answers;
create policy "own answers" on public.attempt_answers for all
  using (exists (select 1 from public.quiz_attempts t where t.id = attempt_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.quiz_attempts t where t.id = attempt_id and t.user_id = auth.uid()));

drop policy if exists "own progress" on public.reading_progress;
create policy "own progress" on public.reading_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "news readable" on public.news_items;
create policy "news readable" on public.news_items for select using (is_relevant);

-- ───────────────────────── Exam timeline (edited by the super admin) ─────────────────────────
create table if not exists public.exam_events (
  code        text primary key,               -- prelims, prelims_result, mains, interview ...
  label       text not null,
  event_date  date not null,
  is_approx   boolean not null default true,  -- shown as "approx." until TNPSC confirms
  sort        int not null default 0,
  updated_at  timestamptz default now()
);
alter table public.exam_events enable row level security;
drop policy if exists "exam events readable" on public.exam_events;
drop policy if exists "superadmin edits exam events" on public.exam_events;
create policy "exam events readable" on public.exam_events for select using (true);
create policy "superadmin edits exam events" on public.exam_events for all using (public.is_superadmin()) with check (public.is_superadmin());
-- Group 1 (2026 cycle). Only Prelims is confirmed; the rest are estimates from the 2025 cycle's gaps.
insert into public.exam_events (code, label, event_date, is_approx, sort) values
  ('prelims',        'Prelims',         '2026-09-27', false, 1),
  ('prelims_result', 'Prelims result',  '2026-12-20', true,  2),
  ('mains',          'Mains',           '2027-03-15', true,  3),
  ('interview',      'Interview',       '2027-07-15', true,  4)
on conflict (code) do nothing;

-- ───────────────────────── Member management (super admin) ─────────────────────────
create or replace function public.admin_list_members()
returns table (id uuid, email text, full_name text, district text, role text, chat_muted_until timestamptz,
               created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'super admin only'; end if;
  return query
    select u.id, u.email::text, p.full_name, p.district, p.role, p.chat_muted_until, u.created_at, u.last_sign_in_at
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;

create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'super admin only'; end if;
  if target = auth.uid() then raise exception 'you cannot change your own role'; end if;
  if new_role not in ('student','admin','superadmin') then raise exception 'unknown role'; end if;
  update public.profiles set role = new_role where id = target;
end $$;
revoke all on function public.admin_list_members() from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_list_members() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ───────────────────────── Discussion chat ─────────────────────────
-- Written only by the chat server (service key), which checks sign-in, mutes and rate limits.
create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      text not null check (room_id ~ '^[a-z0-9-]{2,60}$'),
  user_id      uuid not null references auth.users(id) on delete cascade,
  author_name  text not null,
  author_role  text not null default 'student',
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  deleted_by   uuid references auth.users(id)
);
create index if not exists chat_room_time on public.chat_messages (room_id, created_at desc);
alter table public.chat_messages enable row level security;
drop policy if exists "members read chat" on public.chat_messages;
create policy "members read chat" on public.chat_messages for select to authenticated using (deleted_at is null);

create or replace view public.chat_room_activity as
select room_id, max(created_at) as last_at, count(*) as messages
from public.chat_messages
where deleted_at is null and created_at > now() - interval '14 days'
group by room_id;
revoke all on public.chat_room_activity from anon, authenticated;

-- ───────────────────────── AI chapter summaries (on demand, cached) ─────────────────────────
-- Written by /api/summarize (service key) the first time anyone asks; everyone reuses it after that.
create table if not exists public.chapter_summaries (
  chapter_id    text primary key check (chapter_id ~ '^[a-z0-9]+(-[a-z0-9]+){1,4}$'),
  summary       text not null,
  key_points    jsonb not null default '[]',
  key_facts     jsonb not null default '[]',
  model         text,
  generated_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now()
);
alter table public.chapter_summaries enable row level security;
drop policy if exists "members read summaries" on public.chapter_summaries;
drop policy if exists "admin manages summaries" on public.chapter_summaries;
create policy "members read summaries" on public.chapter_summaries for select to authenticated using (true);
create policy "admin manages summaries" on public.chapter_summaries for delete using (public.is_admin());

-- Make the owner a super admin after they sign up (replace the email):
--   update public.profiles set role = 'superadmin'
--   where id = (select id from auth.users where email = 'you@example.com');

-- Previous year question papers (official TNPSC booklets). Questions link to a paper with source = 'pyq'.
create table if not exists public.pyq_papers (
  id            text primary key,          -- e.g. g1-2024-prelims
  grp           text not null check (grp in ('g1','g2','g3','g4')),
  title         text not null,
  exam_date     date not null,
  year          int  not null,
  duration_min  int  not null default 180,
  total         int  not null default 0,   -- questions in the app for this paper
  source_url    text,
  created_at    timestamptz default now()
);
alter table public.pyq_papers enable row level security;
drop policy if exists "pyq papers readable" on public.pyq_papers;
create policy "pyq papers readable" on public.pyq_papers for select using (true);
drop policy if exists "admin manages pyq papers" on public.pyq_papers;
create policy "admin manages pyq papers" on public.pyq_papers for all using (public.is_admin()) with check (public.is_admin());

alter table public.questions add column if not exists paper_id  text references public.pyq_papers(id) on delete cascade;
alter table public.questions add column if not exists paper_qno int;
create index if not exists questions_paper on public.questions (paper_id, paper_qno) where status = 'approved';

alter table public.quiz_attempts drop constraint if exists quiz_attempts_mode_check;
alter table public.quiz_attempts add constraint quiz_attempts_mode_check check (mode in ('daily','unit','chapter','mock','revise','pyq'));
alter table public.quiz_attempts add column if not exists paper_id text;
