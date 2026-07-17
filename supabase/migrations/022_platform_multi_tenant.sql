-- 멀티 학원(원장) + 플랫폼 관리자 + 구독 뼈대
-- - academies.code / status
-- - profiles.role 에 platform_admin
-- - username 은 학원 단위 유일 (플랫폼 계정은 academy_id null)
-- - subscription_plans / academy_subscriptions

-- -----------------------------------------------------------------------------
-- 학원
-- -----------------------------------------------------------------------------
alter table public.academies
  add column if not exists code text,
  add column if not exists status text not null default 'active',
  add column if not exists max_students int;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'academies_status_check'
      and conrelid = 'public.academies'::regclass
  ) then
    alter table public.academies
      add constraint academies_status_check
      check (status in ('active', 'suspended', 'trial'));
  end if;
end $$;

update public.academies
set code = 'DEMO'
where name = '데모 학원'
  and (code is null or btrim(code) = '');

update public.academies
set code = upper(regexp_replace(coalesce(code, name), '[^a-zA-Z0-9가-힣]', '', 'g'))
where code is null or btrim(code) = '';

-- 빈/중복 코드 방지용 보정
update public.academies a
set code = 'A' || substr(replace(a.id::text, '-', ''), 1, 8)
where a.code is null
   or btrim(a.code) = ''
   or exists (
     select 1
     from public.academies b
     where b.id <> a.id
       and lower(b.code) = lower(a.code)
   );

create unique index if not exists academies_code_lower_uidx
  on public.academies (lower(code));

-- -----------------------------------------------------------------------------
-- 프로필 역할 / 아이디 유일성
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 요금제 / 구독 (결제 연동 전 스키마만)
-- -----------------------------------------------------------------------------
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

create index if not exists academy_subscriptions_plan_idx
  on public.academy_subscriptions (plan_id);

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'trial', '체험', 30, 0, 'manual'
where not exists (select 1 from public.subscription_plans where code = 'trial');

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'standard', '스탠다드', 100, 99000, 'month'
where not exists (select 1 from public.subscription_plans where code = 'standard');

insert into public.subscription_plans (code, name, max_students, price_krw, billing_interval)
select 'pro', '프로', 300, 199000, 'month'
where not exists (select 1 from public.subscription_plans where code = 'pro');

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

alter table public.subscription_plans enable row level security;
alter table public.academy_subscriptions enable row level security;

drop policy if exists "subscription_plans_select_auth" on public.subscription_plans;
create policy "subscription_plans_select_auth" on public.subscription_plans
  for select to authenticated
  using (true);

drop policy if exists "academy_subscriptions_select_own" on public.academy_subscriptions;
create policy "academy_subscriptions_select_own" on public.academy_subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'platform_admin'
          or p.academy_id = academy_subscriptions.academy_id
        )
    )
  );
