-- AI가 원본 문제를 다시 조판한 LaTeX 혼합 문서
alter table public.questions
  add column if not exists problem_latex text;
