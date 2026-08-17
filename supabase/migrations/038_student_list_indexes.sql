-- 학생 목록/대시보드 조회 가속
create index if not exists login_events_user_logged_idx
  on public.login_events (user_id, logged_in_at desc);

create index if not exists profiles_academy_role_idx
  on public.profiles (academy_id, role);

create index if not exists class_room_students_student_idx
  on public.class_room_students (student_id);

create index if not exists activity_events_user_type_created_idx
  on public.activity_events (user_id, event_type, created_at desc);

create index if not exists questions_user_due_idx
  on public.questions (user_id, next_review_date)
  where archived = false and phase <> 'completed';
