-- 관리자 기능 확장:
-- - 학생 추가 정보(휴대폰/학교급/학년)
-- - 반/반담당교사(복수) 배정
-- - 학원별 자동 진급 규칙
-- - 인앱 알림

alter table public.profiles
  add column if not exists phone text,
  add column if not exists school_level text
    check (school_level in ('elementary', 'middle', 'high', 'adult')),
  add column if not exists grade_number int
    check (grade_number >= 1 and grade_number <= 20),
  add column if not exists auto_promote_enabled boolean not null default true;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_phone_idx on public.profiles (phone);

create table if not exists public.class_rooms (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academy_id, name)
);

create table if not exists public.class_room_students (
  id uuid primary key default gen_random_uuid(),
  class_room_id uuid not null references public.class_rooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id)
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

drop trigger if exists academy_promotion_rules_updated_at on public.academy_promotion_rules;
create trigger academy_promotion_rules_updated_at
  before update on public.academy_promotion_rules
  for each row execute function public.set_updated_at();

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

alter table public.class_rooms enable row level security;
alter table public.class_room_students enable row level security;
alter table public.class_room_teachers enable row level security;
alter table public.academy_promotion_rules enable row level security;
alter table public.admin_notifications enable row level security;

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
