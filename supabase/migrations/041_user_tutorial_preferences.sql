-- 계정 기준 Guided Tour 자동 노출 상태
-- auto_hidden 이 true 이면 어떤 기기에서도 해당 key+version 을 자동으로 띄우지 않는다.
-- 수동 「다시 보기」는 이 값을 false 로 되돌리지 않는다.

create table if not exists public.user_tutorial_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tutorial_key text not null,
  tutorial_version integer not null,
  auto_hidden boolean not null default false,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tutorial_key, tutorial_version),
  constraint user_tutorial_preferences_version_positive
    check (tutorial_version > 0)
);

create index if not exists user_tutorial_preferences_user_idx
  on public.user_tutorial_preferences (user_id);

comment on table public.user_tutorial_preferences is
  '계정별 튜토리얼 자동 숨김. localStorage 가 아니라 서버가 기준.';
comment on column public.user_tutorial_preferences.auto_hidden is
  'true 가 되면 일반 동기화로 false 로 되돌리지 않는다.';

alter table public.user_tutorial_preferences enable row level security;

drop policy if exists "user_tutorial_preferences_own"
  on public.user_tutorial_preferences;
create policy "user_tutorial_preferences_own"
  on public.user_tutorial_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 한 번 숨기면 계속 숨김 (race 로 false 덮어쓰기 방지)
create or replace function public.hide_tutorial_preference(
  p_user_id uuid,
  p_tutorial_key text,
  p_tutorial_version integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_tutorial_preferences (
    user_id,
    tutorial_key,
    tutorial_version,
    auto_hidden,
    dismissed_at,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    p_tutorial_key,
    p_tutorial_version,
    true,
    now(),
    now(),
    now()
  )
  on conflict (user_id, tutorial_key, tutorial_version)
  do update set
    auto_hidden = true,
    dismissed_at = coalesce(
      public.user_tutorial_preferences.dismissed_at,
      now()
    ),
    updated_at = now();
end;
$$;

revoke all on function public.hide_tutorial_preference(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.hide_tutorial_preference(uuid, text, integer)
  to service_role;
