import {
  calcProrationKrw,
  estimateMonthlyPriceKrw,
  type PlanCode,
} from "@/lib/billing/plans";
import { tossCustomerKeyForAcademy } from "@/lib/billing/toss";
import { createServiceClient } from "@/lib/supabase/service";

export type AcademyBillingSummary = {
  academyId: string;
  academyName: string;
  academyCode: string;
  studentCount: number;
  pricePerStudentKrw: number;
  estimatedMonthlyKrw: number;
  subscriptionStatus: string;
  periodStart: string | null;
  periodEnd: string | null;
  customerKey: string;
  hasBillingKey: boolean;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  billingRegisteredAt: string | null;
  planCode: PlanCode | string | null;
  planName: string | null;
  ocrDailyLimit: number;
};

export type PublicPlanRow = {
  id: string;
  code: string;
  name: string;
  pricePerStudentKrw: number;
  ocrDailyLimit: number;
  description: string | null;
  highlight: boolean;
  sortOrder: number;
};

export async function getAcademyIdForAdmin(
  adminId: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", adminId)
    .single();
  if (!data || data.role !== "admin") return null;
  return (data.academy_id as string | null) ?? null;
}

export async function getAcademyBillingSummary(
  academyId: string,
): Promise<AcademyBillingSummary | null> {
  const supabase = createServiceClient();

  const [{ data: academy }, { data: sub }, studentCountResult] =
    await Promise.all([
      supabase
        .from("academies")
        .select("id, name, code")
        .eq("id", academyId)
        .maybeSingle(),
      supabase
        .from("academy_subscriptions")
        .select(
          "status, current_period_start, current_period_end, price_per_student_krw, customer_key, billing_key, card_company, card_number_masked, billing_registered_at, plan_id",
        )
        .eq("academy_id", academyId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", academyId)
        .eq("role", "student"),
    ]);

  if (!academy) return null;

  let planCode: string | null = null;
  let planName: string | null = null;
  let ocrDailyLimit = 0;
  let unit = Number(sub?.price_per_student_krw ?? 0);

  if (sub?.plan_id) {
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("code, name, price_per_student_krw, ocr_daily_limit")
      .eq("id", sub.plan_id)
      .maybeSingle();
    if (plan) {
      planCode = (plan.code as string) ?? null;
      planName = (plan.name as string) ?? null;
      ocrDailyLimit = Number(plan.ocr_daily_limit ?? 0);
      if (!unit) unit = Number(plan.price_per_student_krw ?? 0);
    }
  }

  if (!unit) unit = 9900;

  const studentCount = studentCountResult.count ?? 0;
  const customerKey =
    (sub?.customer_key as string | null) ||
    tossCustomerKeyForAcademy(academyId);

  return {
    academyId,
    academyName: academy.name as string,
    academyCode: (academy.code as string | null) ?? "",
    studentCount,
    pricePerStudentKrw: unit,
    estimatedMonthlyKrw: estimateMonthlyPriceKrw(studentCount, unit),
    subscriptionStatus: (sub?.status as string | null) ?? "none",
    periodStart: (sub?.current_period_start as string | null) ?? null,
    periodEnd: (sub?.current_period_end as string | null) ?? null,
    customerKey,
    hasBillingKey: Boolean(sub?.billing_key),
    cardCompany: (sub?.card_company as string | null) ?? null,
    cardNumberMasked: (sub?.card_number_masked as string | null) ?? null,
    billingRegisteredAt: (sub?.billing_registered_at as string | null) ?? null,
    planCode,
    planName,
    ocrDailyLimit,
  };
}

export async function listActivePlans(): Promise<PublicPlanRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select(
      "id, code, name, price_per_student_krw, ocr_daily_limit, description, highlight, sort_order",
    )
    .eq("is_active", true)
    .in("code", ["basic", "pro", "premium"])
    .order("sort_order", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    pricePerStudentKrw: Number(p.price_per_student_krw ?? 0),
    ocrDailyLimit: Number(p.ocr_daily_limit ?? 0),
    description: (p.description as string | null) ?? null,
    highlight: Boolean(p.highlight),
    sortOrder: Number(p.sort_order ?? 0),
  }));
}

export async function changeAcademyPlan(input: {
  academyId: string;
  planCode: PlanCode;
  reason?: "owner" | "ocr_apply" | "system";
  createdBy?: string;
}): Promise<{
  error?: string;
  prorationKrw?: number;
  daysRemaining?: number;
}> {
  const supabase = createServiceClient();

  const [{ data: plan }, summary] = await Promise.all([
    supabase
      .from("subscription_plans")
      .select("id, code, price_per_student_krw, ocr_daily_limit")
      .eq("code", input.planCode)
      .eq("is_active", true)
      .maybeSingle(),
    getAcademyBillingSummary(input.academyId),
  ]);

  if (!plan) return { error: "요금제를 찾을 수 없습니다." };
  if (!summary) return { error: "학원 구독 정보가 없습니다." };
  if (summary.planCode === input.planCode) {
    return { error: "이미 같은 요금제입니다." };
  }

  const { data: sub } = await supabase
    .from("academy_subscriptions")
    .select("plan_id, current_period_start, current_period_end")
    .eq("academy_id", input.academyId)
    .maybeSingle();

  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start as string)
    : new Date();
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end as string)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const proration = calcProrationKrw({
    oldUnitKrw: summary.pricePerStudentKrw,
    newUnitKrw: Number(plan.price_per_student_krw ?? 0),
    studentCount: summary.studentCount,
    periodStart,
    periodEnd,
  });

  const { error: updateError } = await supabase
    .from("academy_subscriptions")
    .upsert(
      {
        academy_id: input.academyId,
        plan_id: plan.id,
        price_per_student_krw: Number(plan.price_per_student_krw ?? 0),
        status: summary.subscriptionStatus === "none" ? "trial" : summary.subscriptionStatus,
        plan_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "academy_id" },
    );

  if (updateError) return { error: updateError.message };

  await supabase.from("plan_change_events").insert({
    academy_id: input.academyId,
    from_plan_id: sub?.plan_id ?? null,
    to_plan_id: plan.id,
    student_count: summary.studentCount,
    old_unit_krw: summary.pricePerStudentKrw,
    new_unit_krw: Number(plan.price_per_student_krw ?? 0),
    days_in_period: proration.daysInPeriod,
    days_remaining: proration.daysRemaining,
    proration_krw: proration.prorationKrw,
    reason: input.reason ?? "owner",
    created_by: input.createdBy ?? null,
  });

  if (proration.prorationKrw !== 0) {
    const orderId = `prorate_${Date.now()}_${input.academyId.replace(/-/g, "").slice(0, 8)}`;
    await supabase.from("billing_charges").insert({
      academy_id: input.academyId,
      order_id: orderId,
      amount_krw: Math.abs(proration.prorationKrw),
      student_count: summary.studentCount,
      price_per_student_krw: Number(plan.price_per_student_krw ?? 0),
      status: "done",
      payment_key: `proration_${input.reason ?? "owner"}`,
      approved_at: new Date().toISOString(),
      failure_message:
        proration.prorationKrw < 0
          ? `다운그레이드 일할 환급 예정 ${Math.abs(proration.prorationKrw)}원`
          : `업그레이드 일할 청구 ${proration.prorationKrw}원`,
    });
  }

  return {
    prorationKrw: proration.prorationKrw,
    daysRemaining: proration.daysRemaining,
  };
}

/** Asia/Seoul 기준 오늘 OCR 사용량 확인·증가 */
export async function consumeOcrQuota(input: {
  userId: string;
  academyId: string | null;
}): Promise<{ error?: string; used?: number; limit?: number }> {
  const supabase = createServiceClient();

  let limit = 0;
  if (input.academyId) {
    const summary = await getAcademyBillingSummary(input.academyId);
    limit = summary?.ocrDailyLimit ?? 0;
  }

  if (limit <= 0) {
    return {
      error:
        "현재 요금제에서는 AI로 읽기(OCR)를 쓸 수 없습니다. Pro 또는 Premium으로 바꿔 주세요.",
      limit: 0,
      used: 0,
    };
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: row } = await supabase
    .from("ocr_daily_usage")
    .select("used_count")
    .eq("user_id", input.userId)
    .eq("usage_date", today)
    .maybeSingle();

  const used = Number(row?.used_count ?? 0);
  if (used >= limit) {
    return {
      error: `오늘 OCR 한도(${limit}회)를 모두 썼습니다. 내일 다시 시도해 주세요.`,
      used,
      limit,
    };
  }

  const next = used + 1;
  const { error } = await supabase.from("ocr_daily_usage").upsert(
    {
      user_id: input.userId,
      usage_date: today,
      used_count: next,
    },
    { onConflict: "user_id,usage_date" },
  );
  if (error) return { error: error.message, used, limit };

  return { used: next, limit };
}

export async function ensureCustomerKey(
  academyId: string,
): Promise<{ error?: string; customerKey?: string }> {
  const supabase = createServiceClient();
  const customerKey = tossCustomerKeyForAcademy(academyId);

  const { data: existing } = await supabase
    .from("academy_subscriptions")
    .select("academy_id, customer_key")
    .eq("academy_id", academyId)
    .maybeSingle();

  if (existing) {
    if (!existing.customer_key) {
      const { error } = await supabase
        .from("academy_subscriptions")
        .update({
          customer_key: customerKey,
          updated_at: new Date().toISOString(),
        })
        .eq("academy_id", academyId);
      if (error) return { error: error.message };
    }
    return {
      customerKey: (existing.customer_key as string | null) || customerKey,
    };
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq("code", "basic")
    .maybeSingle();

  const { error } = await supabase.from("academy_subscriptions").insert({
    academy_id: academyId,
    plan_id: plan?.id ?? null,
    status: "trial",
    customer_key: customerKey,
    price_per_student_krw: Number(plan?.price_per_student_krw ?? 9900),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  return { customerKey };
}

type TossBillingIssueResponse = {
  billingKey?: string;
  customerKey?: string;
  cardCompany?: string;
  cardNumber?: string;
  card?: { number?: string };
  message?: string;
  code?: string;
};

export async function issueBillingKeyFromAuth(input: {
  academyId: string;
  authKey: string;
  customerKey: string;
}): Promise<{ error?: string }> {
  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!secret) return { error: "TOSS_SECRET_KEY 가 설정되지 않았습니다." };

  const ensured = await ensureCustomerKey(input.academyId);
  if (ensured.error) return { error: ensured.error };
  if (ensured.customerKey !== input.customerKey) {
    return { error: "고객 키가 일치하지 않습니다. 다시 카드 등록을 시도해 주세요." };
  }

  const { tossAuthHeader } = await import("@/lib/billing/toss");
  const res = await fetch(
    "https://api.tosspayments.com/v1/billing/authorizations/issue",
    {
      method: "POST",
      headers: {
        Authorization: tossAuthHeader(secret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authKey: input.authKey,
        customerKey: input.customerKey,
      }),
    },
  );

  const body = (await res.json()) as TossBillingIssueResponse;
  if (!res.ok || !body.billingKey) {
    return {
      error:
        body.message ||
        body.code ||
        "빌링키 발급에 실패했습니다. 토스 키·계약 상태를 확인해 주세요.",
    };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("academy_subscriptions")
    .update({
      customer_key: input.customerKey,
      billing_key: body.billingKey,
      card_company: body.cardCompany ?? null,
      card_number_masked: body.cardNumber ?? body.card?.number ?? null,
      billing_registered_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("academy_id", input.academyId);

  if (error) return { error: error.message };
  return {};
}

/** 사업자·토스 계약 전용: 가짜 카드 등록 */
export async function registerMockBillingCard(
  academyId: string,
): Promise<{ error?: string }> {
  const { isBillingMockMode } = await import("@/lib/billing/toss");
  if (!isBillingMockMode()) {
    return { error: "목 결제가 꺼져 있습니다. BILLING_MOCK=1 이거나 토스 키를 비워 두세요." };
  }

  const ensured = await ensureCustomerKey(academyId);
  if (ensured.error) return { error: ensured.error };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("academy_subscriptions")
    .update({
      customer_key: ensured.customerKey,
      billing_key: `mock_billing_${academyId.replace(/-/g, "").slice(0, 16)}`,
      card_company: "목카드",
      card_number_masked: "4330********1234",
      billing_registered_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("academy_id", academyId);

  if (error) return { error: error.message };
  return {};
}

export async function chargeAcademySubscription(input: {
  academyId: string;
  orderName?: string;
}): Promise<{ error?: string; amountKrw?: number; orderId?: string }> {
  const { isBillingMockMode } = await import("@/lib/billing/toss");
  const mock = isBillingMockMode();

  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!mock && !secret) {
    return { error: "TOSS_SECRET_KEY 가 설정되지 않았습니다." };
  }

  const summary = await getAcademyBillingSummary(input.academyId);
  if (!summary) return { error: "학원 구독 정보를 찾을 수 없습니다." };
  if (!summary.hasBillingKey) {
    return { error: "먼저 카드를 등록해 주세요." };
  }
  if (summary.estimatedMonthlyKrw <= 0) {
    return { error: "결제할 금액이 없습니다. (학생 수 0명)" };
  }

  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from("academy_subscriptions")
    .select("billing_key, customer_key")
    .eq("academy_id", input.academyId)
    .maybeSingle();

  if (!sub?.billing_key || !sub.customer_key) {
    return { error: "등록된 결제 수단이 없습니다." };
  }

  const orderId = `rm_${Date.now()}_${input.academyId.replace(/-/g, "").slice(0, 8)}`;
  const amount = summary.estimatedMonthlyKrw;

  const { error: insertError } = await supabase.from("billing_charges").insert({
    academy_id: input.academyId,
    order_id: orderId,
    amount_krw: amount,
    student_count: summary.studentCount,
    price_per_student_krw: summary.pricePerStudentKrw,
    status: "pending",
  });
  if (insertError) return { error: insertError.message };

  if (mock) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await Promise.all([
      supabase
        .from("billing_charges")
        .update({
          status: "done",
          payment_key: `mock_pay_${orderId}`,
          approved_at: new Date().toISOString(),
        })
        .eq("order_id", orderId),
      supabase
        .from("academy_subscriptions")
        .update({
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("academy_id", input.academyId),
    ]);
    return { amountKrw: amount, orderId };
  }

  const { tossAuthHeader } = await import("@/lib/billing/toss");
  const res = await fetch(
    `https://api.tosspayments.com/v1/billing/${encodeURIComponent(sub.billing_key as string)}`,
    {
      method: "POST",
      headers: {
        Authorization: tossAuthHeader(secret!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: sub.customer_key,
        amount,
        orderId,
        orderName:
          input.orderName ||
          `Re:mind ${summary.academyName} ${summary.studentCount}명`,
      }),
    },
  );

  const body = (await res.json()) as {
    paymentKey?: string;
    status?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok || body.status !== "DONE") {
    await supabase
      .from("billing_charges")
      .update({
        status: "failed",
        failure_code: body.code ?? null,
        failure_message: body.message ?? null,
      })
      .eq("order_id", orderId);
    return {
      error: body.message || body.code || "결제에 실패했습니다.",
    };
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await Promise.all([
    supabase
      .from("billing_charges")
      .update({
        status: "done",
        payment_key: body.paymentKey ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("order_id", orderId),
    supabase
      .from("academy_subscriptions")
      .update({
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("academy_id", input.academyId),
  ]);

  return { amountKrw: amount, orderId };
}

export async function listRecentCharges(academyId: string, limit = 10) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("billing_charges")
    .select(
      "id, order_id, amount_krw, student_count, status, created_at, approved_at, failure_message",
    )
    .eq("academy_id", academyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
