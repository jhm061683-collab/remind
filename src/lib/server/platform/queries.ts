import { randomBytes } from "node:crypto";
import {
  estimateMonthlyPriceKrw,
  isPlanCode,
  normalizeAcademyCode,
  validateAcademyCode,
  type PlanCode,
} from "@/lib/billing/pricing";
import { changeAcademyPlan } from "@/lib/server/billing/queries";
import { toAuthEmail } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";
import { PLATFORM_LOGIN_CODE } from "@/types/user";

export type PlatformAcademyRow = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended" | "trial";
  maxStudents: number | null;
  createdAt: string;
  studentCount: number;
  adminName: string | null;
  adminId: string | null;
  adminUsername: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  pricePerStudentKrw: number;
  estimatedMonthlyKrw: number;
  hasBillingKey: boolean;
  cardNumberMasked: string | null;
  planCode: string | null;
};

export type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  maxStudents: number | null;
  priceKrw: number;
  pricePerStudentKrw: number;
  ocrDailyLimit: number;
  billingInterval: string;
  description: string | null;
  highlight: boolean;
};

export type AcademyInviteRow = {
  id: string;
  token: string;
  academyCode: string;
  academyNameHint: string | null;
  pricePerStudentKrw: number;
  planCode: string;
  trialDays: number;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string | null;
  createdAt: string;
  acceptedAcademyId: string | null;
};

export type PublicInviteInfo = {
  token: string;
  academyCode: string;
  academyNameHint: string | null;
  pricePerStudentKrw: number;
  planCode: string;
  trialDays: number;
  expiresAt: string | null;
};

function newInviteToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function listPlatformAcademies(): Promise<PlatformAcademyRow[]> {
  const supabase = createServiceClient();

  const { data: academies, error } = await supabase
    .from("academies")
    .select("id, name, code, status, max_students, created_at")
    .order("created_at", { ascending: true });

  if (error || !academies) return [];

  const academyIds = academies.map((a) => a.id as string);
  if (academyIds.length === 0) return [];

  const [{ data: profiles }, { data: subscriptions }, { data: plans }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, academy_id, role, display_name, username, is_director")
        .in("academy_id", academyIds),
      supabase
        .from("academy_subscriptions")
        .select(
          "academy_id, plan_id, status, current_period_end, price_per_student_krw, billing_key, card_number_masked",
        )
        .in("academy_id", academyIds),
      supabase
        .from("subscription_plans")
        .select("id, name, code, price_per_student_krw"),
    ]);

  const planById = new Map(
    (plans ?? []).map((p) => [
      p.id as string,
      {
        name: p.name as string,
        code: p.code as string,
        unit: Number(p.price_per_student_krw ?? 9900),
      },
    ]),
  );
  const subByAcademy = new Map(
    (subscriptions ?? []).map((s) => [s.academy_id as string, s]),
  );

  return academies.map((academy) => {
    const id = academy.id as string;
    const members = (profiles ?? []).filter((p) => p.academy_id === id);
    const studentCount = members.filter((p) => p.role === "student").length;
    const admin =
      members.find((p) => p.role === "admin" && p.is_director) ??
      members.find((p) => p.role === "admin");
    const sub = subByAcademy.get(id);
    const plan = sub?.plan_id
      ? planById.get(sub.plan_id as string)
      : undefined;
    const pricePerStudentKrw = Number(
      sub?.price_per_student_krw ?? plan?.unit ?? 3000,
    );

    return {
      id,
      name: academy.name as string,
      code: (academy.code as string | null) ?? "",
      status: (academy.status as PlatformAcademyRow["status"]) ?? "active",
      maxStudents: (academy.max_students as number | null) ?? null,
      createdAt: academy.created_at as string,
      studentCount,
      adminName: (admin?.display_name as string | null) ?? null,
      adminId: (admin?.id as string | null) ?? null,
      adminUsername: (admin?.username as string | null) ?? null,
      planName: plan?.name ?? null,
      planCode: plan?.code ?? null,
      subscriptionStatus: (sub?.status as string | null) ?? null,
      periodEnd: (sub?.current_period_end as string | null) ?? null,
      pricePerStudentKrw,
      estimatedMonthlyKrw: estimateMonthlyPriceKrw(
        studentCount,
        pricePerStudentKrw,
      ),
      hasBillingKey: Boolean(sub?.billing_key),
      cardNumberMasked: (sub?.card_number_masked as string | null) ?? null,
    };
  });
}

export async function listSubscriptionPlans(): Promise<SubscriptionPlanRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select(
      "id, code, name, max_students, price_krw, price_per_student_krw, ocr_daily_limit, billing_interval, description, highlight, sort_order",
    )
    .eq("is_active", true)
    .in("code", ["basic", "pro", "premium"])
    .order("sort_order", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    maxStudents: (p.max_students as number | null) ?? null,
    priceKrw: Number(p.price_krw ?? 0),
    pricePerStudentKrw: Number(p.price_per_student_krw ?? 9900),
    ocrDailyLimit: Number(p.ocr_daily_limit ?? 0),
    billingInterval: p.billing_interval as string,
    description: (p.description as string | null) ?? null,
    highlight: Boolean(p.highlight),
  }));
}

export async function listAcademyInvites(): Promise<AcademyInviteRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("academy_invites")
    .select(
      "id, token, academy_code, academy_name_hint, price_per_student_krw, plan_code, trial_days, status, expires_at, created_at, accepted_academy_id",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    token: row.token as string,
    academyCode: row.academy_code as string,
    academyNameHint: (row.academy_name_hint as string | null) ?? null,
    pricePerStudentKrw: Number(row.price_per_student_krw ?? 9900),
    planCode: (row.plan_code as string | null) || "basic",
    trialDays: Number(row.trial_days ?? 14),
    status: row.status as AcademyInviteRow["status"],
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
    acceptedAcademyId: (row.accepted_academy_id as string | null) ?? null,
  }));
}

export async function createAcademyInvite(input: {
  academyCode: string;
  academyNameHint?: string;
  planCode?: string;
  trialDays?: number;
  expiresInDays?: number;
  createdBy?: string;
}): Promise<{ error?: string; token?: string; inviteId?: string }> {
  const codeError = validateAcademyCode(input.academyCode);
  if (codeError) return { error: codeError };
  const code = normalizeAcademyCode(input.academyCode);
  const planCode = isPlanCode(input.planCode ?? "basic")
    ? (input.planCode as PlanCode)
    : "basic";
  const trialDays = Math.floor(input.trialDays ?? 14);
  const expiresInDays = Math.floor(input.expiresInDays ?? 14);
  const hint = input.academyNameHint?.trim() || null;

  const supabase = createServiceClient();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return { error: "요금제를 찾을 수 없습니다." };
  const unit = Number(plan.price_per_student_krw ?? 9900);

  const { data: existingAcademy } = await supabase
    .from("academies")
    .select("id")
    .ilike("code", code)
    .maybeSingle();
  if (existingAcademy) {
    return { error: "이미 사용 중인 학원 코드입니다." };
  }

  const { data: pendingInvite } = await supabase
    .from("academy_invites")
    .select("id")
    .eq("status", "pending")
    .ilike("academy_code", code)
    .maybeSingle();
  if (pendingInvite) {
    return { error: "이미 대기 중인 초대에 같은 코드가 있습니다." };
  }

  const token = newInviteToken();
  const expiresAt =
    expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("academy_invites")
    .insert({
      token,
      academy_code: code,
      academy_name_hint: hint,
      price_per_student_krw: unit,
      plan_code: planCode,
      trial_days: trialDays,
      status: "pending",
      expires_at: expiresAt,
      created_by: input.createdBy ?? null,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "초대 링크를 만들지 못했습니다." };
  }

  return { inviteId: data.id as string, token: data.token as string };
}

export async function revokeAcademyInvite(
  inviteId: string,
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("academy_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  return {};
}

export async function getPublicInvite(
  token: string,
): Promise<{ error?: string; invite?: PublicInviteInfo }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("academy_invites")
    .select(
      "token, academy_code, academy_name_hint, price_per_student_krw, plan_code, trial_days, status, expires_at",
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { error: "초대 링크를 찾을 수 없습니다." };
  if (data.status !== "pending") {
    return { error: "이미 사용되었거나 취소된 초대입니다." };
  }
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
    await supabase
      .from("academy_invites")
      .update({ status: "expired" })
      .eq("token", token)
      .eq("status", "pending");
    return { error: "만료된 초대 링크입니다." };
  }

  return {
    invite: {
      token: data.token as string,
      academyCode: data.academy_code as string,
      academyNameHint: (data.academy_name_hint as string | null) ?? null,
      pricePerStudentKrw: Number(data.price_per_student_krw ?? 9900),
      planCode: (data.plan_code as string | null) || "basic",
      trialDays: Number(data.trial_days ?? 14),
      expiresAt: (data.expires_at as string | null) ?? null,
    },
  };
}

export async function acceptAcademyInvite(input: {
  token: string;
  academyName: string;
  displayName: string;
  username: string;
  password: string;
  phone?: string;
  recoveryEmail?: string;
}): Promise<{ error?: string; academyCode?: string; username?: string }> {
  const academyName = input.academyName.trim();
  const displayName = input.displayName.trim();
  const username = input.username.trim();
  const password = input.password.trim();
  const phone = input.phone?.replace(/\D/g, "") || null;
  const recoveryEmail = input.recoveryEmail?.trim().toLowerCase() || null;

  if (academyName.length < 2) {
    return { error: "학원 이름은 2자 이상으로 입력해 주세요." };
  }
  if (displayName.length < 2) {
    return { error: "원장 이름은 2자 이상으로 입력해 주세요." };
  }
  if (username.length < 2) {
    return { error: "아이디는 2자 이상으로 입력해 주세요." };
  }
  if (password.length < 4) {
    return { error: "비밀번호는 4자 이상으로 입력해 주세요." };
  }
  if (!recoveryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
    return { error: "이메일을 올바르게 입력해 주세요." };
  }

  const supabase = createServiceClient();
  const loaded = await getPublicInvite(input.token);
  if (loaded.error || !loaded.invite) return { error: loaded.error };

  const invite = loaded.invite;
  const code = normalizeAcademyCode(invite.academyCode);

  const { data: existingAcademy } = await supabase
    .from("academies")
    .select("id")
    .ilike("code", code)
    .maybeSingle();
  if (existingAcademy) {
    return { error: "이미 등록된 학원 코드입니다. 플랫폼에 문의해 주세요." };
  }

  const { data: academy, error: academyError } = await supabase
    .from("academies")
    .insert({
      name: academyName,
      code,
      status: "trial",
    })
    .select("id")
    .single();

  if (academyError || !academy) {
    return { error: academyError?.message ?? "학원 생성에 실패했습니다." };
  }

  const academyId = academy.id as string;
  // Auth는 이메일 형식만 받음. 로그인 아이디(한글 등)를 이메일에 넣으면
  // "Unable to validate email address: invalid format" 가 납니다.
  // 실제 로그인은 academy_code + username 으로 하므로, 이메일은 ASCII 전용으로 둡니다.
  const authEmail = toAuthEmail(`${academyId.slice(0, 8)}-${Date.now()}-dir`);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        display_name: displayName,
        username,
        is_director: true,
      },
    });

  if (authError || !authData.user) {
    await supabase.from("academies").delete().eq("id", academyId);
    return {
      error:
        authError?.message === "Unable to validate email address: invalid format"
          ? "계정 이메일 형식 오류가 났습니다. 잠시 후 다시 시도해 주세요."
          : (authError?.message ?? "원장 계정 생성에 실패했습니다."),
    };
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authData.user.id,
    academy_id: academyId,
    role: "admin",
    display_name: displayName,
    username,
    auth_email: authEmail,
    recovery_email: recoveryEmail,
    phone,
    is_director: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from("academies").delete().eq("id", academyId);
    return { error: profileError.message };
  }

  const trialDays = Math.max(0, invite.trialDays);
  const periodEnd = new Date(
    Date.now() + trialDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq(
      "code",
      isPlanCode(invite.planCode) ? invite.planCode : "basic",
    )
    .maybeSingle();

  await supabase.from("academy_subscriptions").upsert(
    {
      academy_id: academyId,
      plan_id: plan?.id ?? null,
      status: "trial",
      price_per_student_krw: Number(
        plan?.price_per_student_krw ?? invite.pricePerStudentKrw ?? 9900,
      ),
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "academy_id" },
  );

  await supabase
    .from("academy_invites")
    .update({
      status: "accepted",
      accepted_academy_id: academyId,
      accepted_at: new Date().toISOString(),
    })
    .eq("token", input.token)
    .eq("status", "pending");

  try {
    const { upsertAdminVisiblePassword } = await import(
      "@/lib/server/admin/password-notes"
    );
    await upsertAdminVisiblePassword(authData.user.id, password, authData.user.id);
  } catch {
    // optional
  }

  return { academyCode: code, username };
}

export async function createAcademyRecord(input: {
  name: string;
  code: string;
  planCode?: string;
  pricePerStudentKrw?: number;
}): Promise<{ error?: string; academyId?: string }> {
  const name = input.name.trim();
  if (name.length < 2) return { error: "학원 이름은 2자 이상으로 입력해 주세요." };
  const codeError = validateAcademyCode(input.code);
  if (codeError) return { error: codeError };
  const code = normalizeAcademyCode(input.code);

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("academies")
    .select("id")
    .ilike("code", code)
    .maybeSingle();
  if (existing) return { error: "이미 사용 중인 학원 코드입니다." };

  const { data: academy, error } = await supabase
    .from("academies")
    .insert({ name, code, status: "trial" })
    .select("id")
    .single();

  if (error || !academy) {
    return { error: error?.message ?? "학원 생성에 실패했습니다." };
  }

  const planCode = isPlanCode(input.planCode ?? "basic")
    ? (input.planCode as PlanCode)
    : "basic";
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq("code", planCode)
    .maybeSingle();

  const unit = Math.floor(
    input.pricePerStudentKrw ?? Number(plan?.price_per_student_krw ?? 9900),
  );

  if (plan?.id) {
    await supabase.from("academy_subscriptions").upsert(
      {
        academy_id: academy.id,
        plan_id: plan.id,
        status: "trial",
        price_per_student_krw: unit,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "academy_id" },
    );
  }

  return { academyId: academy.id as string };
}

export async function setAcademyPlanByOwner(input: {
  academyId: string;
  planCode: PlanCode;
  createdBy: string;
}): Promise<{ error?: string; ok?: string }> {
  const result = await changeAcademyPlan({
    academyId: input.academyId,
    planCode: input.planCode,
    reason: "owner",
    createdBy: input.createdBy,
  });
  if (result.error) return { error: result.error };
  const prorate = result.prorationKrw ?? 0;
  const days = result.daysRemaining ?? 0;
  if (prorate === 0) {
    return { ok: "요금제를 바꿨습니다." };
  }
  if (prorate > 0) {
    return {
      ok: `요금제 변경 · 남은 ${days}일 일할 청구 ${prorate.toLocaleString("ko-KR")}원`,
    };
  }
  return {
    ok: `요금제 변경 · 남은 ${days}일 일할 환급 ${Math.abs(prorate).toLocaleString("ko-KR")}원`,
  };
}

export async function setAcademyStatus(
  academyId: string,
  status: "active" | "suspended" | "trial",
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("academies")
    .update({ status })
    .eq("id", academyId);
  if (error) return { error: error.message };
  return {};
}

function generateTempPassword(): string {
  // 헷갈리는 글자(0/O, 1/l/I) 제외한 8자리
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

/**
 * 플랫폼(owner)이 특정 원장(admin)의 비밀번호를 임시 비번으로 재설정.
 * 원장은 로그인 후 계정 화면에서 스스로 다시 바꾸면 됩니다.
 */
export async function resetDirectorPassword(input: {
  academyId: string;
  directorUserId: string;
  updatedBy: string;
}): Promise<{ error?: string; password?: string; username?: string }> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, academy_id, role")
    .eq("id", input.directorUserId)
    .maybeSingle();

  if (
    !profile ||
    profile.academy_id !== input.academyId ||
    profile.role !== "admin"
  ) {
    return { error: "해당 학원의 원장 계정을 찾을 수 없습니다." };
  }

  const password = generateTempPassword();
  const { error } = await supabase.auth.admin.updateUserById(
    input.directorUserId,
    { password },
  );
  if (error) return { error: error.message };

  try {
    const { upsertAdminVisiblePassword } = await import(
      "@/lib/server/admin/password-notes"
    );
    await upsertAdminVisiblePassword(
      input.directorUserId,
      password,
      input.updatedBy,
    );
  } catch {
    // optional
  }

  return { password, username: (profile.username as string | null) ?? undefined };
}
