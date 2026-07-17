-- 팀장(is_director)은 서브관리자 중 관리자 모드 전환이 가능한 선생님
-- (원장 admin 계정과는 별개. UI에서 「팀장」으로 표시)

comment on column public.profiles.is_director is
  'true면 팀장 선생님: 관리자 모드 전환 가능. admin 역할은 항상 원장.';
