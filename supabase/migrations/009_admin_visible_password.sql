-- 학원 운영용: 관리자가 학생 비밀번호를 확인할 수 있도록 평문 기록
-- (Auth 해시는 Supabase Auth에만 존재. 이 테이블은 관리자 조회용 메모)

create table if not exists public.profile_password_admin (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  password_plain text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.profile_password_admin enable row level security;

-- 일반 로그인 사용자는 직접 조회/수정 불가. 서버(service role)만 사용.
revoke all on table public.profile_password_admin from anon, authenticated;

grant select, insert, update, delete on table public.profile_password_admin to service_role;
