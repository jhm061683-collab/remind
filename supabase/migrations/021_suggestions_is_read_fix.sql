-- 012만 실행해서 is_read 가 빠진 경우를 위한 패치
-- Supabase SQL Editor에서 이 파일만 실행해도 됩니다.

alter table public.suggestions
  add column if not exists is_read boolean not null default false;
