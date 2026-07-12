-- 문제 추가 사진 (2장 이상 — 이어 붙이지 않고 각각 표시)

alter table public.questions
  add column if not exists extra_image_urls text[] not null default '{}';
