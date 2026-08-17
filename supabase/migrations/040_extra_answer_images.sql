-- 해설(정답) 추가 사진 — 문제 사진과 같이 여러 장 각각 표시 (LaTeX 변환 없음)

alter table public.questions
  add column if not exists extra_answer_image_urls text[] not null default '{}';

comment on column public.questions.extra_answer_image_urls is
  '해설 사진 2번째 이후 URL 목록 (원본 이미지 표시용, LaTeX 변환 없음)';

-- save_question_batch에 extra_answer_image_urls 반영 (039 시그니처 유지)
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
      shared_passage,
      ocr_text,
      entry_mode,
      created_by,
      created_by_role,
      answer_text,
      answer_image_url,
      extra_answer_image_urls,
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
      nullif(btrim(v_item->>'shared_passage'), ''),
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
          coalesce(v_item->'extra_answer_image_urls', '[]'::jsonb)
        )
      ),
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
