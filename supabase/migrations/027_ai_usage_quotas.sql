-- AI 이용 쿼터: 월 400건 / 일 30건 / Premium GPT-4o 골드 티켓 100건
--
-- 정책 요약
--   Basic  : AI 분석 없음
--   Pro    : 월 400건, 일 30건, 전량 Gemini 2.5 Flash
--   Premium: 월 400건, 일 30건, 그중 100건은 GPT-4o 골드 티켓
--            (골드 소진 시 자동으로 Gemini Flash로 전환)
--
-- 초기화 전략: 카운터 행의 키가 날짜(usage_date)·월(usage_month)이라서
-- 날이/달이 바뀌면 새 행이 0부터 시작 → 별도 리셋 크론이 필요 없음.
-- (오래된 행 청소용 pg_cron은 선택 사항, 파일 하단 주석 참고)

-- 1) 플랜별 AI 한도 컬럼
alter table public.subscription_plans
  add column if not exists ai_monthly_limit int not null default 0,
  add column if not exists ai_gold_monthly_limit int not null default 0;

-- ocr_daily_limit 를 "AI 이용 일일 한도"로 재사용 (Pro/Premium 모두 30건)
update public.subscription_plans
set
  ocr_daily_limit = 0,
  ai_monthly_limit = 0,
  ai_gold_monthly_limit = 0,
  description = 'AI 분석 없이 오답·복습을 무제한으로 쓰는 기본 요금제'
where code = 'basic';

update public.subscription_plans
set
  ocr_daily_limit = 30,
  ai_monthly_limit = 400,
  ai_gold_monthly_limit = 0,
  description = 'AI 문제 분석 월 400건 (하루 최대 30건, Gemini 2.5 Flash)'
where code = 'pro';

update public.subscription_plans
set
  ocr_daily_limit = 30,
  ai_monthly_limit = 400,
  ai_gold_monthly_limit = 100,
  description = '월 400건 중 100건은 GPT-4o 골드 티켓, 이후 Gemini 자동 전환'
where code = 'premium';

-- 2) 학생별 엔진 우선 설정 (Premium 학원 원장이 토글)
--    true  = 골드 티켓이 남아 있으면 GPT-4o 우선 사용
--    false = 골드 티켓을 아끼고 Gemini만 사용
alter table public.profiles
  add column if not exists ai_prefer_gpt4o boolean not null default true;

-- 3) 학생별 월간 AI 사용량 (usage_month = KST 기준 그 달 1일)
create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_month date not null,
  used_count int not null default 0 check (used_count >= 0),
  gold_used_count int not null default 0 check (gold_used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month)
);

alter table public.ai_usage_monthly enable row level security;

-- 4) 쿼터 검증 + 차감을 한 번에 처리하는 원자적 함수
--    (동시 요청 경쟁을 row lock으로 방지)
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit int,
  p_monthly_limit int,
  p_gold_limit int,
  p_want_gold boolean
) returns table (
  allowed boolean,
  use_gold boolean,
  daily_used int,
  monthly_used int,
  gold_used int,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_month date := (date_trunc('month', timezone('Asia/Seoul', now())))::date;
  v_daily int;
  v_monthly int;
  v_gold int;
  v_use_gold boolean := false;
begin
  insert into public.ocr_daily_usage (user_id, usage_date, used_count)
  values (p_user_id, v_today, 0)
  on conflict (user_id, usage_date) do nothing;

  insert into public.ai_usage_monthly (user_id, usage_month, used_count, gold_used_count)
  values (p_user_id, v_month, 0, 0)
  on conflict (user_id, usage_month) do nothing;

  select d.used_count into v_daily
  from public.ocr_daily_usage d
  where d.user_id = p_user_id and d.usage_date = v_today
  for update;

  select m.used_count, m.gold_used_count into v_monthly, v_gold
  from public.ai_usage_monthly m
  where m.user_id = p_user_id and m.usage_month = v_month
  for update;

  if p_daily_limit > 0 and v_daily >= p_daily_limit then
    return query select false, false, v_daily, v_monthly, v_gold, 'daily_limit'::text;
    return;
  end if;

  if p_monthly_limit > 0 and v_monthly >= p_monthly_limit then
    return query select false, false, v_daily, v_monthly, v_gold, 'monthly_limit'::text;
    return;
  end if;

  -- 골드 티켓: Premium + 학생 설정 on + 잔여분이 있을 때만 GPT-4o
  v_use_gold := p_want_gold and p_gold_limit > 0 and v_gold < p_gold_limit;

  update public.ocr_daily_usage
  set used_count = used_count + 1
  where user_id = p_user_id and usage_date = v_today;

  update public.ai_usage_monthly
  set
    used_count = used_count + 1,
    gold_used_count = gold_used_count + (case when v_use_gold then 1 else 0 end),
    updated_at = now()
  where user_id = p_user_id and usage_month = v_month;

  return query select
    true,
    v_use_gold,
    v_daily + 1,
    v_monthly + 1,
    v_gold + (case when v_use_gold then 1 else 0 end),
    'ok'::text;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from public;
revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from anon;
revoke all on function public.consume_ai_quota(uuid, int, int, int, boolean) from authenticated;
grant execute on function public.consume_ai_quota(uuid, int, int, int, boolean) to service_role;

-- (선택) 오래된 카운터 행 청소 — 필수 아님, 데이터 위생용.
-- Supabase 대시보드에서 pg_cron 확장을 켠 뒤 아래를 실행하면
-- 매일 새벽 4시(KST 기준 아님, UTC)에 90일 지난 행을 지운다.
--
-- select cron.schedule(
--   'cleanup-ai-usage',
--   '0 19 * * *',  -- UTC 19:00 = KST 새벽 4:00
--   $cron$
--     delete from public.ocr_daily_usage
--     where usage_date < (timezone('Asia/Seoul', now()))::date - interval '90 days';
--     delete from public.ai_usage_monthly
--     where usage_month < (date_trunc('month', timezone('Asia/Seoul', now())))::date - interval '6 months';
--   $cron$
-- );
