import { createServiceClient } from "@/lib/supabase/service";

/**
 * AI 엔진 라우팅 + 쿼터 차감
 *
 * 정책 (027 마이그레이션과 한 세트)
 *  - Basic  : AI 사용 불가
 *  - Pro    : 월 400건 / 일 30건, 전량 Gemini 3.5 Flash
 *  - Premium: 월 400건 / 일 30건, 그중 100건은 GPT-4o 골드 티켓
 *             골드 소진(또는 학생별 우선 설정 off) 시 Gemini로 자동 전환
 *
 * 검증·차감은 DB 함수 reserve_ai_quota 한 번의 호출로 원자적으로 처리한다.
 * 요청 UUID를 기준으로 멱등 처리하며, AI 실패 시 refundAiQuota로 환불한다.
 */

export type AiEngine = "gemini-3.5-flash" | "gpt-4o";

/** B타입 = 업로드 즉시 레이텍+정답 추출, A타입 = 온디맨드 상세 해설 */
export type AiTaskKind = "extract" | "explain";

export type EngineQuotaResult = {
  error?: string;
  /** 이번 요청에 사용할 엔진 (성공 시에만) */
  engine?: AiEngine;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  goldUsed: number;
  goldLimit: number;
  requestStatus?: "reserved" | "completed" | "refunded" | "rejected";
  /** 동일 요청이 이미 완료된 경우 재사용할 AI 응답 */
  cachedPayload?: unknown;
};

type PlanLimits = {
  planCode: string;
  dailyLimit: number;
  monthlyLimit: number;
  goldLimit: number;
};

async function getPlanLimitsForAcademy(
  academyId: string,
): Promise<PlanLimits | null> {
  const supabase = createServiceClient();

  const { data: sub } = await supabase
    .from("academy_subscriptions")
    .select("plan_id")
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!sub?.plan_id) return null;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("code, ocr_daily_limit, ai_monthly_limit, ai_gold_monthly_limit")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return null;

  return {
    planCode: (plan.code as string) ?? "",
    dailyLimit: Number(plan.ocr_daily_limit ?? 0),
    monthlyLimit: Number(plan.ai_monthly_limit ?? 0),
    goldLimit: Number(plan.ai_gold_monthly_limit ?? 0),
  };
}

const EMPTY_USAGE = {
  dailyUsed: 0,
  dailyLimit: 0,
  monthlyUsed: 0,
  monthlyLimit: 0,
  goldUsed: 0,
  goldLimit: 0,
};

/**
 * 학생이 문제를 업로드(extract)하거나 해설을 요청(explain)할 때 호출.
 * 플랜·잔여 쿼터를 확인해 엔진을 정하고, 통과하면 즉시 1건을 차감한다.
 */
export async function getAvailableEngineAndDeductQuota(input: {
  requestId: string;
  userId: string;
  academyId: string | null;
  kind: AiTaskKind;
  /** false면 GPT-4o 골드 티켓을 쓰지 않음 (OpenAI 키 없을 때) */
  allowGold?: boolean;
  /** 학생이 이번 요청에서 정밀 AI를 선택했는지 */
  preferGold?: boolean;
}): Promise<EngineQuotaResult> {
  if (!input.academyId) {
    return {
      error: "학원 정보가 없어 AI 기능을 쓸 수 없습니다.",
      ...EMPTY_USAGE,
    };
  }

  const limits = await getPlanLimitsForAcademy(input.academyId);
  if (!limits || limits.monthlyLimit <= 0) {
    return {
      error:
        "현재 요금제(Basic)에서는 AI 문제 분석을 쓸 수 없습니다. Pro 또는 Premium으로 바꿔 주세요.",
      ...EMPTY_USAGE,
    };
  }

  const supabase = createServiceClient();

  // Premium: 학생이 이번 요청에서 고른 방식이 저장된 기본값보다 우선한다.
  // 선택값이 없으면 비용 효율적인 기본 방식(false)을 사용한다.
  const wantGold =
    limits.goldLimit > 0 &&
    input.allowGold !== false &&
    input.preferGold === true;

  const { data, error } = await supabase.rpc("reserve_ai_quota", {
    p_request_id: input.requestId,
    p_user_id: input.userId,
    p_academy_id: input.academyId,
    p_kind: input.kind,
    p_daily_limit: limits.dailyLimit,
    p_monthly_limit: limits.monthlyLimit,
    p_gold_limit: limits.goldLimit,
    p_want_gold: wantGold,
  });

  if (error) {
    return { error: error.message, ...EMPTY_USAGE };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { error: "쿼터 확인에 실패했습니다.", ...EMPTY_USAGE };
  }

  const usage = {
    dailyUsed: Number(row.daily_used ?? 0),
    dailyLimit: limits.dailyLimit,
    monthlyUsed: Number(row.monthly_used ?? 0),
    monthlyLimit: limits.monthlyLimit,
    goldUsed: Number(row.gold_used ?? 0),
    goldLimit: limits.goldLimit,
    requestStatus: row.request_status as EngineQuotaResult["requestStatus"],
  };

  if (row.request_status === "completed" && row.response_payload) {
    return {
      engine: row.use_gold ? "gpt-4o" : "gemini-3.5-flash",
      cachedPayload: row.response_payload,
      ...usage,
    };
  }

  if (row.request_status === "reserved" && row.reason === "duplicate") {
    return {
      error: "같은 AI 요청을 처리하고 있습니다. 잠시 후 다시 확인해 주세요.",
      ...usage,
    };
  }

  if (!row.allowed) {
    const message =
      row.reason === "daily_limit"
        ? `오늘 AI 이용 한도(${limits.dailyLimit}건)를 모두 썼습니다. 내일 다시 시도해 주세요.`
        : row.reason === "monthly_limit"
          ? `이번 달 AI 이용 한도(${limits.monthlyLimit}건)를 모두 썼습니다. 다음 달에 초기화됩니다.`
          : "이 AI 요청은 취소되었습니다. 다시 시도해 주세요.";
    return { error: message, ...usage };
  }

  return {
    engine: row.use_gold ? "gpt-4o" : "gemini-3.5-flash",
    ...usage,
  };
}

/** AI 성공 결과를 요청 UUID에 저장하여 네트워크 재전송 시 재사용한다. */
export async function completeAiRequest(input: {
  requestId: string;
  userId: string;
  responsePayload: unknown;
}): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("complete_ai_request", {
    p_request_id: input.requestId,
    p_user_id: input.userId,
    p_response_payload: input.responsePayload,
  });
  if (error || data !== true) {
    throw new Error(error?.message ?? "AI_REQUEST_COMPLETE_FAILED");
  }
}

/** 외부 AI 호출이 실패하면 해당 요청이 예약한 쿼터를 정확히 한 번 환불한다. */
export async function refundAiQuota(input: {
  requestId: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("refund_ai_quota", {
    p_request_id: input.requestId,
    p_user_id: input.userId,
    p_error_reason: input.reason ?? "ai_failed",
  });
  if (error) {
    console.error("[refundAiQuota]", error.message);
  }
}

/** 차감 없이 현재 사용량만 조회 (마이페이지·관리자 화면 표시용) */
export async function getAiUsageSnapshot(userId: string): Promise<{
  dailyUsed: number;
  monthlyUsed: number;
  goldUsed: number;
}> {
  const supabase = createServiceClient();

  const kstNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const month = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: daily }, { data: monthly }] = await Promise.all([
    supabase
      .from("ocr_daily_usage")
      .select("used_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle(),
    supabase
      .from("ai_usage_monthly")
      .select("used_count, gold_used_count")
      .eq("user_id", userId)
      .eq("usage_month", month)
      .maybeSingle(),
  ]);

  return {
    dailyUsed: Number(daily?.used_count ?? 0),
    monthlyUsed: Number(monthly?.used_count ?? 0),
    goldUsed: Number(monthly?.gold_used_count ?? 0),
  };
}

export type StudentAiQuotaStatus = {
  planCode: string;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  advancedUsed: number;
  advancedLimit: number;
  preferAdvanced: boolean;
};

/** 학생 업로드 화면에 표시할 플랜·잔여량 (차감 없음) */
export async function getStudentAiQuotaStatus(
  userId: string,
): Promise<StudentAiQuotaStatus | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, ai_prefer_gpt4o")
    .eq("id", userId)
    .maybeSingle();
  const academyId = profile?.academy_id as string | null;
  if (!academyId) return null;

  const limits = await getPlanLimitsForAcademy(academyId);
  if (!limits || limits.monthlyLimit <= 0) return null;
  const usage = await getAiUsageSnapshot(userId);
  return {
    planCode: limits.planCode,
    dailyUsed: usage.dailyUsed,
    dailyLimit: limits.dailyLimit,
    monthlyUsed: usage.monthlyUsed,
    monthlyLimit: limits.monthlyLimit,
    advancedUsed: usage.goldUsed,
    advancedLimit: limits.goldLimit,
    preferAdvanced: profile?.ai_prefer_gpt4o === true,
  };
}
