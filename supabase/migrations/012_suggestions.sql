-- 학생 건의사항 (현재: 원장(admin) 조회 / 추후: 플랫폼 메인 계정 조회로 이전 예정)

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists suggestions_created_at_idx
  on public.suggestions (created_at desc);

create index if not exists suggestions_academy_idx
  on public.suggestions (academy_id, created_at desc);

alter table public.suggestions enable row level security;

-- 학생: 본인 건의만 작성·조회
drop policy if exists "suggestions_insert_own" on public.suggestions;
create policy "suggestions_insert_own"
  on public.suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "suggestions_select_own" on public.suggestions;
create policy "suggestions_select_own"
  on public.suggestions for select
  to authenticated
  using (auth.uid() = user_id);

-- 원장: 같은 학원 건의 조회 (추후 platform_admin 전용으로 이전)
drop policy if exists "suggestions_select_admin" on public.suggestions;
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
