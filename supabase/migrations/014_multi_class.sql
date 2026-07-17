-- 학생 다중 반 배정 + 학년별 반 관리

alter table public.class_rooms
  add column if not exists school_level text
    check (school_level in ('elementary', 'middle', 'high', 'adult')),
  add column if not exists grade_number int
    check (grade_number >= 1 and grade_number <= 20);

alter table public.class_room_students
  drop constraint if exists class_room_students_student_id_key;

alter table public.class_room_students
  drop constraint if exists class_room_students_class_student_key;

alter table public.class_room_students
  add constraint class_room_students_class_student_key
  unique (class_room_id, student_id);

create index if not exists class_rooms_grade_idx
  on public.class_rooms (academy_id, school_level, grade_number);
