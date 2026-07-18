-- =============================================================================
-- Re:mind — Supabase 전체 스키마 (한 번에 실행)
-- =============================================================================
-- 사용법:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. 이 파일 전체 복사 → 붙여넣기 → Run
--
-- 이미 DB가 있어도 안전하게 다시 실행할 수 있게 작성했습니다 (idempotent).
-- 평소에는 migrations/ 를 하나씩 돌리지 말고, 이 파일만 쓰세요.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 학원 / 프로필
-- -----------------------------------------------------------------------------
create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  status text not null default 'active',
  max_students int,
  created_at timestamptz not null default now()
);

alter table public.academies
  add column if not exists code text,
  add column if not exists status text not null default 'active',
  add column if not exists max_students int;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  role text not null,
  display_name text not null,
  username text,
  is_director boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists phone text,
  add column if not exists school_level text,
  add column if not exists grade_number int,
  add column if not exists auto_promote_enabled boolean not null default true,
  add column if not exists auth_email text,
  add column if not exists recovery_email text,
  add column if not exists is_director boolean not null default false,
  add column if not exists nickname text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'sub_admin', 'platform_admin'));

alter table public.profiles drop constraint if exists profiles_username_key;
drop index if exists public.profiles_username_key;

create unique index if not exists profiles_academy_username_uidx
  on public.profiles (academy_id, lower(username))
  where username is not null and academy_id is not null;

create unique index if not exists profiles_platform_username_uidx
  on public.profiles (lower(username))
  where username is not null and academy_id is null;

create unique index if not exists academies_code_lower_uidx
  on public.academies (lower(code));

-- school_level / grade_number 제약은 기존 DB와 충돌할 수 있어 별도 강제하지 않음

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_phone_idx on public.profiles (phone);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_students int,
  price_krw int not null default 0,
  billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_subscriptions (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null unique references public.academies (id) on delete cascade,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'canceled', 'none')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 복습 설정 / 프리셋
-- -----------------------------------------------------------------------------
create table if not exists public.review_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null default '__global__',
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_id)
);

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

-- -----------------------------------------------------------------------------
-- 오답 문제
-- -----------------------------------------------------------------------------
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

alter table public.questions
  add column if not exists source text,
  add column if not exists wrong_reason text,
  add column if not exists reflection_memo text,
  add column if not exists extra_image_urls text[] not null default '{}',
  add column if not exists wrong_reason_detail text,
  add column if not exists wrong_keywords text[] not null default '{}';

create index if not exists questions_user_subject_idx
  on public.questions (user_id, subject_id);
create index if not exists questions_next_review_idx
  on public.questions (user_id, next_review_date);

-- -----------------------------------------------------------------------------
-- 로그인 / 활동
-- -----------------------------------------------------------------------------
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_in_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null
    check (event_type in ('registered', 'reviewed', 'archived')),
  question_id uuid references public.questions (id) on delete set null,
  wrong_reason text,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_user_type_idx
  on public.activity_events (user_id, event_type);

-- -----------------------------------------------------------------------------
-- 관리자: 담당 배정 / 반 / 알림 / 비밀번호 메모
-- -----------------------------------------------------------------------------
create table if not exists public.student_assignments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references public.academies (id) on delete cascade,
  sub_admin_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id)
);

create index if not exists student_assignments_sub_admin_idx
  on public.student_assignments (sub_admin_id);

create table if not exists public.class_rooms (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null,
  school_level text
    check (school_level in ('elementary', 'middle', 'high', 'adult')),
  grade_number int
    check (grade_number >= 1 and grade_number <= 20),
  is_director_class boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists class_rooms_academy_grade_name_uidx
  on public.class_rooms (
    academy_id,
    coalesce(school_level, ''),
    coalesce(grade_number, 0),
    name
  );

alter table public.class_rooms
  add column if not exists school_level text,
  add column if not exists grade_number int,
  add column if not exists is_director_class boolean not null default false;

create table if not exists public.class_room_students (
  id uuid primary key default gen_random_uuid(),
  class_room_id uuid not null references public.class_rooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_room_id, student_id)
);

create table if not exists public.class_room_teachers (
  id uuid primary key default gen_random_uuid(),
  class_room_id uuid not null references public.class_rooms (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_room_id, teacher_id)
);

create table if not exists public.academy_promotion_rules (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null unique references public.academies (id) on delete cascade,
  promotion_month int not null default 1 check (promotion_month between 1 and 12),
  promotion_day int not null default 1 check (promotion_day between 1 and 31),
  timezone text not null default 'Asia/Seoul',
  last_promoted_on date,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  sent_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_target_idx
  on public.admin_notifications (target_user_id, created_at desc);

create table if not exists public.profile_password_admin (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  password_plain text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- 건의사항 (학생 → 현재 원장 조회 / 추후 플랫폼 메인 계정)
-- -----------------------------------------------------------------------------
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.suggestions
  add column if not exists is_read boolean not null default false;

create index if not exists suggestions_created_at_idx
  on public.suggestions (created_at desc);
create index if not exists suggestions_academy_idx
  on public.suggestions (academy_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 트리거 / 함수
-- -----------------------------------------------------------------------------
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

drop trigger if exists academy_promotion_rules_updated_at on public.academy_promotion_rules;
create trigger academy_promotion_rules_updated_at
  before update on public.academy_promotion_rules
  for each row execute function public.set_updated_at();

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

-- -----------------------------------------------------------------------------
-- RLS 켜기
-- -----------------------------------------------------------------------------
alter table public.academies enable row level security;
alter table public.profiles enable row level security;
alter table public.review_settings enable row level security;
alter table public.custom_preset_overrides enable row level security;
alter table public.questions enable row level security;
alter table public.login_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.student_assignments enable row level security;
alter table public.class_rooms enable row level security;
alter table public.class_room_students enable row level security;
alter table public.class_room_teachers enable row level security;
alter table public.academy_promotion_rules enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.profile_password_admin enable row level security;
alter table public.suggestions enable row level security;

-- -----------------------------------------------------------------------------
-- Policies (있으면 후 재생성)
-- -----------------------------------------------------------------------------
drop policy if exists "academies_select" on public.academies;
create policy "academies_select" on public.academies
  for select to authenticated using (true);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists "review_settings_all_own" on public.review_settings;
create policy "review_settings_all_own" on public.review_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "presets_all_own" on public.custom_preset_overrides;
create policy "presets_all_own" on public.custom_preset_overrides
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "questions_all_own" on public.questions;
create policy "questions_all_own" on public.questions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "login_events_insert_own" on public.login_events;
drop policy if exists "login_events_select_own" on public.login_events;
create policy "login_events_insert_own" on public.login_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "login_events_select_own" on public.login_events
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "activity_events_all_own" on public.activity_events;
create policy "activity_events_all_own" on public.activity_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "assignments_admin_select" on public.student_assignments;
drop policy if exists "assignments_sub_admin_select" on public.student_assignments;
drop policy if exists "assignments_admin_all" on public.student_assignments;
create policy "assignments_admin_select" on public.student_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = student_assignments.academy_id
    )
  );
create policy "assignments_sub_admin_select" on public.student_assignments
  for select to authenticated
  using (sub_admin_id = auth.uid());
create policy "assignments_admin_all" on public.student_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = student_assignments.academy_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = student_assignments.academy_id
    )
  );

drop policy if exists "class_rooms_admin_all" on public.class_rooms;
create policy "class_rooms_admin_all" on public.class_rooms
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = class_rooms.academy_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = class_rooms.academy_id
    )
  );

drop policy if exists "class_room_students_admin_all" on public.class_room_students;
create policy "class_room_students_admin_all" on public.class_room_students
  for all to authenticated
  using (
    exists (
      select 1
      from public.class_rooms c
      join public.profiles p on p.academy_id = c.academy_id
      where c.id = class_room_students.class_room_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.class_rooms c
      join public.profiles p on p.academy_id = c.academy_id
      where c.id = class_room_students.class_room_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "class_room_teachers_admin_all" on public.class_room_teachers;
create policy "class_room_teachers_admin_all" on public.class_room_teachers
  for all to authenticated
  using (
    exists (
      select 1
      from public.class_rooms c
      join public.profiles p on p.academy_id = c.academy_id
      where c.id = class_room_teachers.class_room_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.class_rooms c
      join public.profiles p on p.academy_id = c.academy_id
      where c.id = class_room_teachers.class_room_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "promotion_rules_admin_all" on public.academy_promotion_rules;
create policy "promotion_rules_admin_all" on public.academy_promotion_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = academy_promotion_rules.academy_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.academy_id = academy_promotion_rules.academy_id
    )
  );

drop policy if exists "notifications_target_select" on public.admin_notifications;
drop policy if exists "notifications_admin_insert" on public.admin_notifications;
create policy "notifications_target_select" on public.admin_notifications
  for select to authenticated
  using (
    target_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'sub_admin')
        and p.academy_id = admin_notifications.academy_id
    )
  );
create policy "notifications_admin_insert" on public.admin_notifications
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'sub_admin')
        and p.academy_id = admin_notifications.academy_id
    )
  );

drop policy if exists "suggestions_insert_own" on public.suggestions;
drop policy if exists "suggestions_select_own" on public.suggestions;
drop policy if exists "suggestions_select_admin" on public.suggestions;
create policy "suggestions_insert_own"
  on public.suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "suggestions_select_own"
  on public.suggestions for select
  to authenticated
  using (auth.uid() = user_id);
create policy "suggestions_select_admin"
  on public.suggestions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and (
          p.academy_id is null
          or p.academy_id = suggestions.academy_id
          or suggestions.academy_id is null
        )
    )
  );

-- 관리자 비밀번호 메모: 클라이언트 직접 접근 차단 (서버 service_role만)
revoke all on table public.profile_password_admin from anon, authenticated;
grant select, insert, update, delete on table public.profile_password_admin to service_role;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

drop policy if exists "images_upload_own_folder" on storage.objects;
drop policy if exists "images_update_own_folder" on storage.objects;
drop policy if exists "images_delete_own_folder" on storage.objects;
drop policy if exists "images_public_read" on storage.objects;

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

-- -----------------------------------------------------------------------------
-- 기본 데이터 / 백필
-- -----------------------------------------------------------------------------
insert into public.academies (name, code, status)
select '데모 학원', 'DEMO', 'active'
where not exists (select 1 from public.academies where name = '데모 학원');

update public.academies
set code = 'DEMO'
where name = '데모 학원'
  and (code is null or btrim(code) = '');

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'trial', '체험', 30, 0, 'manual'
where not exists (select 1 from public.subscription_plans where code = 'trial');

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'standard', '스탠다드', 100, 99000, 'month'
where not exists (select 1 from public.subscription_plans where code = 'standard');

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'pro', '프로', 300, 199000, 'month'
where not exists (select 1 from public.subscription_plans where code = 'pro');

alter table public.academy_subscriptions
  add column if not exists price_per_student_krw int;

alter table public.academy_subscriptions
  add column if not exists customer_key text,
  add column if not exists billing_key text,
  add column if not exists card_company text,
  add column if not exists card_number_masked text,
  add column if not exists billing_registered_at timestamptz;

create table if not exists public.billing_charges (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  order_id text not null unique,
  amount_krw int not null check (amount_krw >= 0),
  student_count int not null default 0,
  price_per_student_krw int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'failed', 'canceled')),
  payment_key text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

update public.subscription_plans
set price_per_student_krw = 3000
where price_per_student_krw is null;

update public.academy_subscriptions
set price_per_student_krw = coalesce(price_per_student_krw, 3000)
where price_per_student_krw is null;

create table if not exists public.academy_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  academy_code text not null,
  academy_name_hint text,
  price_per_student_krw int not null default 3000
    check (price_per_student_krw >= 0),
  trial_days int not null default 14
    check (trial_days >= 0 and trial_days <= 365),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  accepted_academy_id uuid references public.academies (id) on delete set null,
  accepted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists academy_invites_pending_code_uidx
  on public.academy_invites (lower(academy_code))
  where status = 'pending';

create index if not exists academy_invites_status_idx
  on public.academy_invites (status, created_at desc);

alter table public.academy_invites enable row level security;

insert into public.academy_subscriptions (academy_id, plan_id, status, current_period_start, current_period_end)
select
  a.id,
  p.id,
  'trial',
  now(),
  now() + interval '30 days'
from public.academies a
cross join public.subscription_plans p
where p.code = 'trial'
  and not exists (
    select 1 from public.academy_subscriptions s where s.academy_id = a.id
  );

update public.profiles
set academy_id = (
  select id from public.academies where name = '데모 학원' limit 1
)
where academy_id is null
  and role <> 'platform_admin';

update public.profiles p
set auth_email = u.email
from auth.users u
where p.id = u.id
  and (p.auth_email is null or p.auth_email = '');

-- -----------------------------------------------------------------------------
-- Basic / Pro / Premium + OCR 일일 한도
-- -----------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists price_per_student_krw int,
  add column if not exists ocr_daily_limit int,
  add column if not exists sort_order int not null default 0,
  add column if not exists description text,
  add column if not exists highlight boolean not null default false;

alter table public.academy_subscriptions
  add column if not exists plan_changed_at timestamptz;

alter table public.academy_invites
  add column if not exists plan_code text;

update public.subscription_plans
set is_active = false
where code in ('trial', 'standard');

insert into public.subscription_plans as p
  (code, name, max_students, price_krw, price_per_student_krw, billing_interval, is_active, ocr_daily_limit, sort_order, description, highlight)
values
  ('basic', 'Basic', null, 9900, 9900, 'month', true, 0, 1,
   'OCR 없이 오답·복습을 무제한으로 쓰는 기본 요금제', false),
  ('pro', 'Pro', null, 29000, 29000, 'month', true, 10, 2,
   'AI로 읽기(OCR)를 하루 최대 10문제까지', true),
  ('premium', 'Premium', null, 49000, 49000, 'month', true, 20, 3,
   'AI로 읽기(OCR)를 하루 최대 20문제까지', false)
on conflict (code) do update set
  name = excluded.name,
  max_students = excluded.max_students,
  price_krw = excluded.price_krw,
  price_per_student_krw = excluded.price_per_student_krw,
  billing_interval = excluded.billing_interval,
  is_active = excluded.is_active,
  ocr_daily_limit = excluded.ocr_daily_limit,
  sort_order = excluded.sort_order,
  description = excluded.description,
  highlight = excluded.highlight;

update public.academy_subscriptions s
set
  plan_id = p.id,
  price_per_student_krw = p.price_per_student_krw,
  updated_at = now()
from public.subscription_plans p
where p.code = 'basic'
  and (
    s.plan_id is null
    or s.plan_id in (
      select id from public.subscription_plans where code in ('trial', 'standard')
    )
  );

update public.academy_subscriptions s
set price_per_student_krw = p.price_per_student_krw,
    updated_at = now()
from public.subscription_plans p
where s.plan_id = p.id
  and p.code in ('basic', 'pro', 'premium');

create table if not exists public.plan_change_events (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  from_plan_id uuid references public.subscription_plans (id) on delete set null,
  to_plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  student_count int not null default 0,
  old_unit_krw int not null default 0,
  new_unit_krw int not null default 0,
  days_in_period int not null default 0,
  days_remaining int not null default 0,
  proration_krw int not null default 0,
  reason text not null default 'owner'
    check (reason in ('owner', 'ocr_apply', 'system')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists plan_change_events_academy_idx
  on public.plan_change_events (academy_id, created_at desc);

alter table public.plan_change_events enable row level security;

create table if not exists public.ocr_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default (timezone('Asia/Seoul', now()))::date,
  used_count int not null default 0 check (used_count >= 0),
  primary key (user_id, usage_date)
);

alter table public.ocr_daily_usage enable row level security;

-- -----------------------------------------------------------------------------
-- AI 이용 쿼터: 월 400건 / 일 30건 / Premium GPT-4o 골드 티켓 100건 (027)
-- -----------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists ai_monthly_limit int not null default 0,
  add column if not exists ai_gold_monthly_limit int not null default 0;

update public.subscription_plans
set
  ocr_daily_limit = 0,
  ai_monthly_limit = 0,
  ai_gold_monthly_limit = 0,
  description = 'AI 분석 없이 오답·복습을 무제한으로 쓰는 기본 요금제'
where code = 'basic';

update public.subscription_plans
set
  ocr_daily_limit = 30,
  ai_monthly_limit = 400,
  ai_gold_monthly_limit = 0,
  description = 'AI 문제 분석 월 400건 (하루 최대 30건, Gemini 2.5 Flash)'
where code = 'pro';

update public.subscription_plans
set
  ocr_daily_limit = 30,
  ai_monthly_limit = 400,
  ai_gold_monthly_limit = 100,
  description = '월 400건 중 100건은 GPT-4o 골드 티켓, 이후 Gemini 자동 전환'
where code = 'premium';

alter table public.profiles
  add column if not exists ai_prefer_gpt4o boolean not null default true;

create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_month date not null,
  used_count int not null default 0 check (used_count >= 0),
  gold_used_count int not null default 0 check (gold_used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month)
);

alter table public.ai_usage_monthly enable row level security;

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit int,
  p_monthly_limit int,
  p_gold_limit int,
  p_want_gold boolean
) returns table (
  allowed boolean,
  use_gold boolean,
  daily_used int,
  monthly_used int,
  gold_used int,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_month date := (date_trunc('month', timezone('Asia/Seoul', now())))::date;
  v_daily int;
  v_monthly int;
  v_gold int;
  v_use_gold boolean := false;
begin
  insert into public.ocr_daily_usage (user_id, usage_date, used_count)
  values (p_user_id, v_today, 0)
  on conflict (user_id, usage_date) do nothing;

  insert into public.ai_usage_monthly (user_id, usage_month, used_count, gold_used_count)
  values (p_user_id, v_month, 0, 0)
  on conflict (user_id, usage_month) do nothing;

  select d.used_count into v_daily
  from public.ocr_daily_usage d
  where d.user_id = p_user_id and d.usage_date = v_today
  for update;

  select m.used_count, m.gold_used_count into v_monthly, v_gold
  from public.ai_usage_monthly m
  where m.user_id = p_user_id and m.usage_month = v_month
  for update;

  if p_daily_limit > 0 and v_daily >= p_daily_limit then
    return query select false, false, v_daily, v_monthly, v_gold, 'daily_limit'::text;
    return;
  end if;

  if p_monthly_limit > 0 and v_monthly >= p_monthly_limit then
    return query select false, false, v_daily, v_monthly, v_gold, 'monthly_limit'::text;
    return;
  end if;

  v_use_gold := p_want_gold and p_gold_limit > 0 and v_gold < p_gold_limit;

  update public.ocr_daily_usage
  set used_count = used_count + 1
  where user_id = p_user_id and usage_date = v_today;

  update public.ai_usage_monthly
  set
    used_count = used_count + 1,
    gold_used_count = gold_used_count + (case when v_use_gold then 1 else 0 end),
    updated_at = now()
  where user_id = p_user_id and usage_month = v_month;

  return query select
    true,
    v_use_gold,
    v_daily + 1,
    v_monthly + 1,
    v_gold + (case when v_use_gold then 1 else 0 end),
    'ok'::text;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from public;
revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from anon;
revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from authenticated;
grant execute on function public.consume_ai_quota(uuid, int, int, int, boolean) to service_role;
