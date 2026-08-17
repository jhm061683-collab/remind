-- add-only: 스태프 위험 작업 감사 로그. 비밀번호 값은 저장하지 않는다.
-- 운영 적용은 별도 승인 후에만 실행한다.

create table if not exists public.staff_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  academy_id uuid references public.academies (id) on delete set null,
  action text not null,
  success boolean not null default true,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists staff_audit_events_academy_created_idx
  on public.staff_audit_events (academy_id, created_at desc);

alter table public.staff_audit_events enable row level security;

revoke all on table public.staff_audit_events from anon, authenticated;
grant select, insert on table public.staff_audit_events to service_role;
