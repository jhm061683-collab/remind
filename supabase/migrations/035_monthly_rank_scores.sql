-- 월간 랭킹 스냅샷 + 퇴원 표시 (지난달 명예의 전당 / 퇴원 후 1개월 유지)
alter table public.profiles
  add column if not exists withdrawn_at timestamptz;

comment on column public.profiles.withdrawn_at is '퇴원 시각. null이면 재원';

create table if not exists public.academy_month_scores (
  academy_id uuid not null references public.academies (id) on delete cascade,
  month_key text not null,
  student_id uuid not null,
  display_name text not null,
  avatar_url text,
  school_level text,
  grade_number int,
  classes jsonb not null default '[]'::jsonb,
  review_count int not null default 0,
  enrolled_at_month_end boolean not null default true,
  kept_until date,
  updated_at timestamptz not null default now(),
  primary key (academy_id, month_key, student_id)
);

create index if not exists academy_month_scores_month_idx
  on public.academy_month_scores (academy_id, month_key);

comment on table public.academy_month_scores is
  '월간 복습 점수 스냅샷. 월말 재원 기준 합산 + 퇴원생 한 달 유지';
