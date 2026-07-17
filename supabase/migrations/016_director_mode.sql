-- 원장 권한(관리자 모드 전환) + 원장반

alter table public.profiles
  add column if not exists is_director boolean not null default false;

update public.profiles
set is_director = true
where role = 'admin' and is_director is distinct from true;

alter table public.class_rooms
  add column if not exists is_director_class boolean not null default false;
