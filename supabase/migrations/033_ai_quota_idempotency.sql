-- AI 요청 멱등성 + 쿼터 예약/확정/환불
--
-- 외부 AI API 호출은 PostgreSQL 트랜잭션 안에 포함할 수 없다.
-- 따라서 다음 3단계로 처리한다.
--   1) reserve_ai_quota  : 요청 UUID를 잠그고 쿼터를 원자적으로 예약
--   2) complete_ai_request: AI 성공 결과를 저장하고 완료 확정
--   3) refund_ai_quota   : AI 실패 시 예약했던 일/월/골드 쿼터를 정확히 환불
--
-- 동일 request_id가 재전송되면 쿼터를 다시 차감하지 않으며,
-- 완료된 요청은 저장된 response_payload를 반환한다.

create table if not exists public.ai_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete cascade,
  kind text not null check (kind in ('extract', 'explain')),
  status text not null check (
    status in ('reserved', 'completed', 'refunded', 'rejected')
  ),
  use_gold boolean not null default false,
  usage_date date not null,
  usage_month date not null,
  error_reason text,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz
);

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);

-- 브라우저에서 직접 조회하지 않고 service_role RPC로만 접근한다.
alter table public.ai_requests enable row level security;

create or replace function public.reserve_ai_quota(
  p_request_id uuid,
  p_user_id uuid,
  p_academy_id uuid,
  p_kind text,
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
  reason text,
  request_status text,
  response_payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_month date := (date_trunc('month', timezone('Asia/Seoul', now())))::date;
  v_daily int := 0;
  v_monthly int := 0;
  v_gold int := 0;
  v_use_gold boolean := false;
  v_existing public.ai_requests%rowtype;
begin
  if p_request_id is null or p_user_id is null then
    raise exception 'INVALID_AI_REQUEST';
  end if;

  if p_kind not in ('extract', 'explain') then
    raise exception 'INVALID_AI_REQUEST_KIND';
  end if;

  -- 같은 UUID가 동시에 처음 도착하는 경우에도 한 요청만 진행되게 한다.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  select *
  into v_existing
  from public.ai_requests
  where request_id = p_request_id
  for update;

  if found then
    if v_existing.user_id <> p_user_id then
      raise exception 'AI_REQUEST_OWNER_MISMATCH';
    end if;

    select coalesce(d.used_count, 0)
    into v_daily
    from public.ocr_daily_usage d
    where d.user_id = p_user_id
      and d.usage_date = v_existing.usage_date;

    select coalesce(m.used_count, 0), coalesce(m.gold_used_count, 0)
    into v_monthly, v_gold
    from public.ai_usage_monthly m
    where m.user_id = p_user_id
      and m.usage_month = v_existing.usage_month;

    return query select
      v_existing.status in ('reserved', 'completed'),
      v_existing.use_gold,
      coalesce(v_daily, 0),
      coalesce(v_monthly, 0),
      coalesce(v_gold, 0),
      coalesce(v_existing.error_reason, 'duplicate'),
      v_existing.status,
      v_existing.response_payload;
    return;
  end if;

  insert into public.ocr_daily_usage (user_id, usage_date, used_count)
  values (p_user_id, v_today, 0)
  on conflict (user_id, usage_date) do nothing;

  insert into public.ai_usage_monthly (
    user_id,
    usage_month,
    used_count,
    gold_used_count
  )
  values (p_user_id, v_month, 0, 0)
  on conflict (user_id, usage_month) do nothing;

  -- 모든 요청이 일간 → 월간 순서로 잠그므로 교착 상태를 피한다.
  select d.used_count
  into v_daily
  from public.ocr_daily_usage d
  where d.user_id = p_user_id and d.usage_date = v_today
  for update;

  select m.used_count, m.gold_used_count
  into v_monthly, v_gold
  from public.ai_usage_monthly m
  where m.user_id = p_user_id and m.usage_month = v_month
  for update;

  if p_daily_limit > 0 and v_daily >= p_daily_limit then
    insert into public.ai_requests (
      request_id, user_id, academy_id, kind, status,
      usage_date, usage_month, error_reason
    ) values (
      p_request_id, p_user_id, p_academy_id, p_kind, 'rejected',
      v_today, v_month, 'daily_limit'
    );

    return query select
      false, false, v_daily, v_monthly, v_gold,
      'daily_limit'::text, 'rejected'::text, null::jsonb;
    return;
  end if;

  if p_monthly_limit > 0 and v_monthly >= p_monthly_limit then
    insert into public.ai_requests (
      request_id, user_id, academy_id, kind, status,
      usage_date, usage_month, error_reason
    ) values (
      p_request_id, p_user_id, p_academy_id, p_kind, 'rejected',
      v_today, v_month, 'monthly_limit'
    );

    return query select
      false, false, v_daily, v_monthly, v_gold,
      'monthly_limit'::text, 'rejected'::text, null::jsonb;
    return;
  end if;

  -- 골드가 소진되면 같은 요청 안에서 빠른 AI로 자연스럽게 폴백한다.
  v_use_gold :=
    p_want_gold and p_gold_limit > 0 and v_gold < p_gold_limit;

  insert into public.ai_requests (
    request_id, user_id, academy_id, kind, status, use_gold,
    usage_date, usage_month
  ) values (
    p_request_id, p_user_id, p_academy_id, p_kind, 'reserved', v_use_gold,
    v_today, v_month
  );

  update public.ocr_daily_usage
  set used_count = used_count + 1
  where user_id = p_user_id and usage_date = v_today;

  update public.ai_usage_monthly
  set
    used_count = used_count + 1,
    gold_used_count =
      gold_used_count + (case when v_use_gold then 1 else 0 end),
    updated_at = now()
  where user_id = p_user_id and usage_month = v_month;

  return query select
    true,
    v_use_gold,
    v_daily + 1,
    v_monthly + 1,
    v_gold + (case when v_use_gold then 1 else 0 end),
    'ok'::text,
    'reserved'::text,
    null::jsonb;
end;
$$;

create or replace function public.complete_ai_request(
  p_request_id uuid,
  p_user_id uuid,
  p_response_payload jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ai_requests%rowtype;
begin
  select *
  into v_request
  from public.ai_requests
  where request_id = p_request_id
  for update;

  if not found or v_request.user_id <> p_user_id then
    raise exception 'AI_REQUEST_NOT_FOUND';
  end if;

  if v_request.status = 'completed' then
    return true;
  end if;

  if v_request.status <> 'reserved' then
    return false;
  end if;

  update public.ai_requests
  set
    status = 'completed',
    response_payload = p_response_payload,
    completed_at = now(),
    updated_at = now()
  where request_id = p_request_id;

  return true;
end;
$$;

create or replace function public.refund_ai_quota(
  p_request_id uuid,
  p_user_id uuid,
  p_error_reason text default 'ai_failed'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ai_requests%rowtype;
begin
  select *
  into v_request
  from public.ai_requests
  where request_id = p_request_id
  for update;

  if not found or v_request.user_id <> p_user_id then
    return false;
  end if;

  -- 완료·기환불·거절 요청은 절대 다시 차감/환불하지 않는다.
  if v_request.status <> 'reserved' then
    return v_request.status = 'refunded';
  end if;

  update public.ocr_daily_usage
  set used_count = greatest(0, used_count - 1)
  where user_id = p_user_id
    and usage_date = v_request.usage_date;

  update public.ai_usage_monthly
  set
    used_count = greatest(0, used_count - 1),
    gold_used_count = greatest(
      0,
      gold_used_count - (case when v_request.use_gold then 1 else 0 end)
    ),
    updated_at = now()
  where user_id = p_user_id
    and usage_month = v_request.usage_month;

  update public.ai_requests
  set
    status = 'refunded',
    error_reason = left(coalesce(p_error_reason, 'ai_failed'), 200),
    refunded_at = now(),
    updated_at = now()
  where request_id = p_request_id;

  return true;
end;
$$;

revoke all on function public.reserve_ai_quota(
  uuid, uuid, uuid, text, int, int, int, boolean
) from public, anon, authenticated;
grant execute on function public.reserve_ai_quota(
  uuid, uuid, uuid, text, int, int, int, boolean
) to service_role;

revoke all on function public.complete_ai_request(
  uuid, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_ai_request(
  uuid, uuid, jsonb
) to service_role;

revoke all on function public.refund_ai_quota(
  uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(
  uuid, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 다중 문항 최종 저장: 한 문항이라도 실패하면 질문·활동 로그 전체 롤백
-- 이미지 파일 업로드는 DB 트랜잭션 대상이 아니므로 먼저 끝낸 URL만 전달한다.
-- ---------------------------------------------------------------------------

create table if not exists public.question_save_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_ids uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.question_save_requests enable row level security;

create or replace function public.save_question_batch(
  p_request_id uuid,
  p_user_id uuid,
  p_actor_role text,
  p_questions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.question_save_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_question public.questions%rowtype;
  v_ids uuid[] := '{}';
  v_result jsonb;
begin
  if p_request_id is null or p_user_id is null then
    raise exception 'INVALID_SAVE_REQUEST';
  end if;

  if jsonb_typeof(p_questions) <> 'array'
     or jsonb_array_length(p_questions) < 1
     or jsonb_array_length(p_questions) > 20 then
    raise exception 'INVALID_QUESTION_BATCH';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  select *
  into v_existing
  from public.question_save_requests
  where request_id = p_request_id
  for update;

  if found then
    if v_existing.user_id <> p_user_id then
      raise exception 'SAVE_REQUEST_OWNER_MISMATCH';
    end if;

    select coalesce(
      jsonb_agg(to_jsonb(q) order by array_position(v_existing.question_ids, q.id)),
      '[]'::jsonb
    )
    into v_result
    from public.questions q
    where q.id = any(v_existing.question_ids);

    return v_result;
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  if not found
     or v_profile.role not in ('student', 'admin', 'sub_admin')
     or v_profile.role <> p_actor_role then
    raise exception 'QUESTION_SAVE_FORBIDDEN';
  end if;

  for v_item in select value from jsonb_array_elements(p_questions)
  loop
    if nullif(btrim(v_item->>'subject_id'), '') is null
       or nullif(btrim(v_item->>'image_url'), '') is null
       or nullif(btrim(v_item->>'answer_text'), '') is null
       or nullif(btrim(v_item->>'next_review_date'), '') is null then
      raise exception 'INVALID_QUESTION_PAYLOAD';
    end if;

    insert into public.questions (
      user_id,
      academy_id,
      subject_id,
      image_url,
      extra_image_urls,
      problem_latex,
      ocr_text,
      entry_mode,
      created_by,
      created_by_role,
      answer_text,
      answer_image_url,
      keywords,
      source,
      wrong_reason,
      wrong_keywords,
      wrong_reason_detail,
      reflection_memo,
      phase,
      streak_count,
      next_review_date
    ) values (
      p_user_id,
      v_profile.academy_id,
      btrim(v_item->>'subject_id'),
      btrim(v_item->>'image_url'),
      array(
        select jsonb_array_elements_text(
          coalesce(v_item->'extra_image_urls', '[]'::jsonb)
        )
      ),
      nullif(btrim(v_item->>'problem_latex'), ''),
      nullif(btrim(v_item->>'ocr_text'), ''),
      case
        when v_item->>'entry_mode' = 'ai' then 'ai'
        else 'manual'
      end,
      p_user_id,
      p_actor_role,
      btrim(v_item->>'answer_text'),
      nullif(btrim(v_item->>'answer_image_url'), ''),
      array(
        select jsonb_array_elements_text(
          coalesce(v_item->'keywords', '[]'::jsonb)
        )
      ),
      nullif(btrim(v_item->>'source'), ''),
      nullif(btrim(v_item->>'wrong_reason'), ''),
      array(
        select jsonb_array_elements_text(
          coalesce(v_item->'wrong_keywords', '[]'::jsonb)
        )
      ),
      nullif(btrim(v_item->>'wrong_reason_detail'), ''),
      nullif(btrim(v_item->>'reflection_memo'), ''),
      'short',
      0,
      (v_item->>'next_review_date')::timestamptz
    )
    returning * into v_question;

    v_ids := array_append(v_ids, v_question.id);

    insert into public.activity_events (
      user_id, event_type, question_id, wrong_reason
    ) values (
      p_user_id, 'registered', v_question.id, v_question.wrong_reason
    );
  end loop;

  insert into public.question_save_requests (
    request_id, user_id, question_ids
  ) values (
    p_request_id, p_user_id, v_ids
  );

  select jsonb_agg(to_jsonb(q) order by array_position(v_ids, q.id))
  into v_result
  from public.questions q
  where q.id = any(v_ids);

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.save_question_batch(
  uuid, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function public.save_question_batch(
  uuid, uuid, text, jsonb
) to service_role;
