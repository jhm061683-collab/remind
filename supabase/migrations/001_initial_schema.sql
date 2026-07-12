-- 오답정리 앱 — Supabase 초기 스키마
-- Supabase Dashboard → SQL Editor 에서 실행하세요.

-- 확장
create extension if not exists "pgcrypto";

-- 학원 (추후 학원별 판매용)
create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 사용자 프로필 (auth.users 와 1:1)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  role text not null check (role in ('student', 'admin', 'sub_admin')),
  display_name text not null,
  username text unique,
  created_at timestamptz not null default now()
);

-- 복습 설정 (subject_id '__global__' = 전체 과목 공통)
create table if not exists public.review_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null default '__global__',
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_id)
);

-- 프리셋 사용자 수정값 (수능/내신/공시)
create table if not exists public.custom_preset_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  preset_id text not null,
  settings jsonb not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, preset_id)
);

-- 오답 문제
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  subject_id text not null,
  image_url text not null,
  answer_text text,
  answer_image_url text,
  keywords text[] not null default '{}',
  phase text not null default 'short'
    check (phase in ('short', 'medium', 'long', 'completed')),
  streak_count int not null default 0,
  next_review_date timestamptz not null,
  last_answered_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists questions_user_subject_idx
  on public.questions (user_id, subject_id);
create index if not exists questions_next_review_idx
  on public.questions (user_id, next_review_date);

-- 로그인 기록 (관리자 차트용 — 2단계에서 활용)
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_in_at timestamptz not null default now()
);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists review_settings_updated_at on public.review_settings;
create trigger review_settings_updated_at
  before update on public.review_settings
  for each row execute function public.set_updated_at();

drop trigger if exists custom_preset_overrides_updated_at on public.custom_preset_overrides;
create trigger custom_preset_overrides_updated_at
  before update on public.custom_preset_overrides
  for each row execute function public.set_updated_at();

-- 가입 시 profiles 자동 생성 (메타데이터 role, display_name 사용)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name, username, academy_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    (select id from public.academies where name = '데모 학원' limit 1)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.academies enable row level security;
alter table public.profiles enable row level security;
alter table public.review_settings enable row level security;
alter table public.custom_preset_overrides enable row level security;
alter table public.questions enable row level security;
alter table public.login_events enable row level security;

-- academies: 로그인 사용자 읽기
create policy "academies_select" on public.academies
  for select to authenticated using (true);

-- profiles
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- review_settings
create policy "review_settings_all_own" on public.review_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- custom_preset_overrides
create policy "presets_all_own" on public.custom_preset_overrides
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- questions
create policy "questions_all_own" on public.questions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- login_events
create policy "login_events_insert_own" on public.login_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "login_events_select_own" on public.login_events
  for select to authenticated using (user_id = auth.uid());

-- Storage: question-images 버킷
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "images_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "images_update_own_folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "images_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'question-images');

-- 데모 학원
insert into public.academies (name)
select '데모 학원'
where not exists (select 1 from public.academies where name = '데모 학원');
