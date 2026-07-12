-- 오답 키워드 (문제 키워드 keywords 와 분리)

alter table public.questions
  add column if not exists wrong_keywords text[] not null default '{}';
