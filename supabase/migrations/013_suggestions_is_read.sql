-- 건의사항 읽음 여부 (이미 setup.sql 돌렸어도 이것만 추가 실행 가능)

alter table public.suggestions
  add column if not exists is_read boolean not null default false;
