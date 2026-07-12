-- 관리자: 서브관리자 ↔ 학생 담당 배정

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

alter table public.student_assignments enable row level security;

-- authenticated 관리자는 같은 학원 배정 조회 (향후 클라이언트 직접 조회용)
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
