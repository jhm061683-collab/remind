-- 원장 초대 링크 + 학생 수 기준 월요금(단가)

alter table public.academy_subscriptions
  add column if not exists price_per_student_krw int;

alter table public.subscription_plans
  add column if not exists price_per_student_krw int;

-- 기존 고정가 플랜 → 학생당 단가 기본값(원하면 커맨드센터에서 초대마다 덮어씀)
update public.subscription_plans
set price_per_student_krw = 3000
where price_per_student_krw is null;

update public.academy_subscriptions
set price_per_student_krw = coalesce(
  price_per_student_krw,
  (select p.price_per_student_krw from public.subscription_plans p where p.code = 'trial' limit 1),
  3000
)
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

-- 초대는 서비스 롤/서버에서만 읽고 씀 (공개 페이지도 서버 액션)
drop policy if exists "academy_invites_no_direct" on public.academy_invites;
