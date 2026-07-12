-- 로그인 속도: username → 실제 auth 이메일 1회 조회로 매핑

alter table public.profiles
  add column if not exists auth_email text;

create index if not exists profiles_username_idx on public.profiles (username);

-- 기존 계정 이메일 백필
update public.profiles p
set auth_email = u.email
from auth.users u
where p.id = u.id
  and (p.auth_email is null or p.auth_email = '');
