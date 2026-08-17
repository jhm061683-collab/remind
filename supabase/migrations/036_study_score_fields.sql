-- 학습량 랭킹 스코어 필드 (단기/중기/장기/출석)
alter table public.academy_month_scores
  add column if not exists study_score numeric not null default 0,
  add column if not exists short_count int not null default 0,
  add column if not exists medium_count int not null default 0,
  add column if not exists long_count int not null default 0,
  add column if not exists attendance_days int not null default 0;

comment on column public.academy_month_scores.study_score is
  '학습량 점수 = 단기/중기/장기 복습 가중 + 출석일 가중. AI 사용량 제외';
