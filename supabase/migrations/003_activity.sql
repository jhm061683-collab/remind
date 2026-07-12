-- 활동 이벤트 (복습·등록·정복 추적 — 마일스톤·주간 리포트용)

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

alter table public.activity_events enable row level security;

create policy "activity_events_all_own" on public.activity_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
