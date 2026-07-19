-- 오답 원본 데이터 보강 + 원장/강사의 수동 학부모 보고서

alter table public.questions
  add column if not exists ocr_text text,
  add column if not exists entry_mode text not null default 'manual'
    check (entry_mode in ('manual', 'ai')),
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists created_by_role text
    check (created_by_role in ('student', 'admin', 'sub_admin'));

create table if not exists public.parent_reports (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique,
  title text not null,
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists parent_reports_student_created_idx
  on public.parent_reports (student_id, created_at desc);
create index if not exists parent_reports_academy_created_idx
  on public.parent_reports (academy_id, created_at desc);

alter table public.parent_reports enable row level security;

-- 공개 링크 조회는 서비스 역할을 쓰는 서버 페이지에서만 수행한다.
-- 브라우저가 테이블을 직접 읽는 RLS 정책은 의도적으로 만들지 않는다.
