-- 스태프 닉네임 (표시용, 선택)

alter table public.profiles
  add column if not exists nickname text;
