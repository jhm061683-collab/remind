-- academy_id 가 비어 있는 프로필을 데모 학원에 연결

update public.profiles
set academy_id = (
  select id from public.academies where name = '데모 학원' limit 1
)
where academy_id is null;
