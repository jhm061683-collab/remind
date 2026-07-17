-- 데모/초기 시드의 「박원장」을 실제 원장 이름으로 교체
update public.profiles
set
  display_name = '장현문',
  is_director = true
where role = 'admin'
  and display_name in ('박원장', '박원장님');
