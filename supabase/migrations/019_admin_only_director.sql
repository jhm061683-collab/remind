-- 서브선생님에게 부여됐던 원장 플래그 해제 (원장은 admin 계정만)
update public.profiles
set is_director = false
where role = 'sub_admin'
  and coalesce(is_director, false) = true;

-- admin 표시 이름이 데모 「박원장」이면 장현문으로
update public.profiles
set
  display_name = '장현문',
  is_director = true
where role = 'admin'
  and display_name in ('박원장', '박원장님');
