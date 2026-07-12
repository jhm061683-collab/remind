-- 틀린 이유 세부내용 (보관함 검색 키워드로 사용)

alter table public.questions
  add column if not exists wrong_reason_detail text;
