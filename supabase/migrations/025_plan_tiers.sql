-- Basic / Pro / Premium 요금제 + OCR 일일 한도 + 플랜 변경·사용량

alter table public.subscription_plans
  add column if not exists ocr_daily_limit int,
  add column if not exists sort_order int not null default 0,
  add column if not exists description text,
  add column if not exists highlight boolean not null default false;

alter table public.academy_subscriptions
  add column if not exists plan_changed_at timestamptz;

alter table public.academy_invites
  add column if not exists plan_code text;

-- 구 플랜 비활성
update public.subscription_plans
set is_active = false
where code in ('trial', 'standard');

-- 신규 3단 요금제 (학생 1명당 / 월)
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

-- 예전 pro(다른 단가) 코드가 있었다면 위 upsert로 덮어씀

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

-- 플랜 변경·일할계산 기록
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

-- 학생별 OCR 일일 사용량
create table if not exists public.ocr_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default (timezone('Asia/Seoul', now()))::date,
  used_count int not null default 0 check (used_count >= 0),
  primary key (user_id, usage_date)
);

alter table public.ocr_daily_usage enable row level security;
