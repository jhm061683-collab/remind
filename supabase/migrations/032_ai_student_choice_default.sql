-- 학생이 매 요청마다 AI 정리 방식을 선택하며, 기본값은 빠른 AI 정리
alter table public.profiles
  alter column ai_prefer_gpt4o set default false;

-- 기존 계정도 다음 선택 전까지 비용 효율적인 기본 방식 사용
update public.profiles
set ai_prefer_gpt4o = false
where ai_prefer_gpt4o = true;
