-- 과목별·건당 비용 분석용 메타데이터
alter table public.ai_cost_logs
  add column if not exists subject_id text,
  add column if not exists image_count int not null default 1,
  add column if not exists problem_count int not null default 1;

create index if not exists ai_cost_logs_subject_created_idx
  on public.ai_cost_logs (subject_id, created_at desc);
