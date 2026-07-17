-- 토스페이먼츠 빌링키 저장 (카드 번호는 저장하지 않음)

alter table public.academy_subscriptions
  add column if not exists customer_key text,
  add column if not exists billing_key text,
  add column if not exists card_company text,
  add column if not exists card_number_masked text,
  add column if not exists billing_registered_at timestamptz;

create unique index if not exists academy_subscriptions_customer_key_uidx
  on public.academy_subscriptions (customer_key)
  where customer_key is not null;

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

create index if not exists billing_charges_academy_idx
  on public.billing_charges (academy_id, created_at desc);

alter table public.billing_charges enable row level security;
