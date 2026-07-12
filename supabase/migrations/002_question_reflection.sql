-- 문제별 오답 분석 필드 (키워드 검색과 별도)
alter table public.questions
  add column if not exists source text,
  add column if not exists wrong_reason text,
  add column if not exists reflection_memo text;
