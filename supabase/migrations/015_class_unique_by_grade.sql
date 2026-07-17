-- 같은 반 이름이라도 학년(학교급+학년)이 다르면 허용

alter table public.class_rooms
  drop constraint if exists class_rooms_academy_id_name_key;

alter table public.class_rooms
  drop constraint if exists class_rooms_academy_grade_name_key;

-- school_level / grade_number 가 null 인 기존 반은 이름만으로도 구분되게 유지
create unique index if not exists class_rooms_academy_grade_name_uidx
  on public.class_rooms (
    academy_id,
    coalesce(school_level, ''),
    coalesce(grade_number, 0),
    name
  );
