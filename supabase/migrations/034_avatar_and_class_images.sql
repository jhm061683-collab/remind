-- 학생/반 프로필 이미지 + 공개 조회용 (랭킹·명예의 전당)
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.class_rooms
  add column if not exists image_url text;

-- 이미 발급한 보고서 링크를 다시 찾기 위한 공유 토큰 보관
alter table public.parent_reports
  add column if not exists share_token text;

create unique index if not exists parent_reports_share_token_uidx
  on public.parent_reports (share_token)
  where share_token is not null;

comment on column public.profiles.avatar_url is '학생/스태프 선택 프로필 이미지 URL';
comment on column public.class_rooms.image_url is '반 대표 이미지 URL (선택)';
comment on column public.parent_reports.share_token is '공유 URL용 토큰 (만료·폐기 전까지 재조회)';
