import { randomBytes } from "node:crypto";
import {
  estimateMonthlyPriceKrw,
  normalizeAcademyCode,
} from "@/lib/billing/pricing";
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
  planName: string | null;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  pricePerStudentKrw: number;
  estimatedMonthlyKrw: number;
  hasBillingKey: boolean;
  cardNumberMasked: string | null;
};

export type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  maxStudents: number | null;
  priceKrw: number;
  pricePerStudentKrw: number;
  billingInterval: string;
};

export type AcademyInviteRow = {
  id: string;
  token: string;
  academyCode: string;
  academyNameHint: string | null;
  pricePerStudentKrw: number;
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
        .select("id, academy_id, role, display_name")
        .in("academy_id", academyIds),
      supabase
        .from("academy_subscriptions")
        .select(
          "academy_id, plan_id, status, current_period_end, price_per_student_krw, billing_key, card_number_masked",
        )
        .in("academy_id", academyIds),
      supabase
        .from("subscription_plans")
        .select("id, name, price_per_student_krw"),
    ]);

  const planById = new Map(
    (plans ?? []).map((p) => [
      p.id as string,
      {
        name: p.name as string,
        unit: Number(p.price_per_student_krw ?? 3000),
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
    const admin = members.find((p) => p.role === "admin");
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
      planName: plan?.name ?? null,
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
      "id, code, name, max_students, price_krw, price_per_student_krw, billing_interval",
    )
    .eq("is_active", true)
    .order("price_krw", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    maxStudents: (p.max_students as number | null) ?? null,
    priceKrw: Number(p.price_krw ?? 0),
    pricePerStudentKrw: Number(p.price_per_student_krw ?? 3000),
    billingInterval: p.billing_interval as string,
  }));
}

export async function listAcademyInvites(): Promise<AcademyInviteRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("academy_invites")
    .select(
      "id, token, academy_code, academy_name_hint, price_per_student_krw, trial_days, status, expires_at, created_at, accepted_academy_id",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    token: row.token as string,
    academyCode: row.academy_code as string,
    academyNameHint: (row.academy_name_hint as string | null) ?? null,
    pricePerStudentKrw: Number(row.price_per_student_krw ?? 3000),
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
  pricePerStudentKrw: number;
  trialDays?: number;
  expiresInDays?: number;
  createdBy?: string;
}): Promise<{ error?: string; token?: string; inviteId?: string }> {
  const code = normalizeAcademyCode(input.academyCode);
  const unit = Math.floor(input.pricePerStudentKrw);
  const trialDays = Math.floor(input.trialDays ?? 14);
  const expiresInDays = Math.floor(input.expiresInDays ?? 14);
  const hint = input.academyNameHint?.trim() || null;

  if (code.length < 2) return { error: "학원 코드는 2자 이상으로 입력해 주세요." };
  if (code === PLATFORM_LOGIN_CODE) {
    return { error: "PLATFORM은 예약된 코드입니다." };
  }
  if (!Number.isFinite(unit) || unit < 0) {
    return { error: "학생 1명당 단가를 확인해 주세요." };
  }

  const supabase = createServiceClient();

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
      "token, academy_code, academy_name_hint, price_per_student_krw, trial_days, status, expires_at",
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
      pricePerStudentKrw: Number(data.price_per_student_krw ?? 3000),
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
}): Promise<{ error?: string; academyCode?: string; username?: string }> {
  const academyName = input.academyName.trim();
  const displayName = input.displayName.trim();
  const username = input.username.trim();
  const password = input.password.trim();
  const phone = input.phone?.replace(/\D/g, "") || null;

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
    .select("id")
    .eq("code", "trial")
    .maybeSingle();

  await supabase.from("academy_subscriptions").upsert(
    {
      academy_id: academyId,
      plan_id: plan?.id ?? null,
      status: "trial",
      price_per_student_krw: invite.pricePerStudentKrw,
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
  const code = normalizeAcademyCode(input.code);
  if (name.length < 2) return { error: "학원 이름은 2자 이상으로 입력해 주세요." };
  if (code.length < 2) return { error: "학원 코드는 2자 이상으로 입력해 주세요." };
  if (code === PLATFORM_LOGIN_CODE) {
    return { error: "PLATFORM은 예약된 코드입니다." };
  }

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

  const planCode = input.planCode?.trim() || "trial";
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, price_per_student_krw")
    .eq("code", planCode)
    .maybeSingle();

  const unit = Math.floor(
    input.pricePerStudentKrw ?? Number(plan?.price_per_student_krw ?? 3000),
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
