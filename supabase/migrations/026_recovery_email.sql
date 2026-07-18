-- 원장 비밀번호 분실 대비: 실제 연락용 이메일(선택) 저장 칸
-- 로그인은 여전히 학원코드 + 아이디 + 비밀번호. auth_email(가짜)과는 별개.
alter table public.profiles
  add column if not exists recovery_email text;
