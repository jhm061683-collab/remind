import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { isSupabaseEnabled, toAuthEmail } from "@/lib/supabase/config";
import {
  defaultPasswordFromPhone,
  normalizePhone,
  type SchoolLevel,
} from "@/lib/admin/grade";
import type { UserRole } from "@/types/user";

export type CreateAcademyUserInput = {
  username?: string;
  password?: string;
  displayName: string;
  phone: string;
  schoolLevel?: SchoolLevel;
  gradeNumber?: number;
  role: Extract<UserRole, "student" | "sub_admin">;
};

function normalizeUsername(raw: string): string {
  return raw.trim();
}

function validateInput(input: CreateAcademyUserInput): string | null {
  const username = normalizeUsername(input.username ?? input.displayName);
  if (username.length < 2) {
    return "아이디(사용자 이름)는 2자 이상으로 입력해 주세요.";
  }
  if (!input.displayName.trim()) {
    return "이름을 입력해 주세요.";
  }
  const phoneDigits = normalizePhone(input.phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    return "휴대폰 번호를 정확히 입력해 주세요.";
  }
  if (input.role !== "student" && input.role !== "sub_admin") {
    return "잘못된 계정 유형입니다.";
  }
  if (input.role === "student") {
    if (!input.schoolLevel || !input.gradeNumber) {
      return "학생 계정은 학교급/학년이 필요합니다.";
    }
  }
  return null;
}

async function getAdminAcademyId(adminId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", adminId)
    .single();
  return data?.academy_id ?? null;
}

export async function createAcademyUser(
  adminId: string,
  input: CreateAcademyUserInput,
): Promise<{ error?: string; userId?: string; username?: string; password?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  if (!isSupabaseEnabled() || !isServiceRoleConfigured()) {
    return {
      error:
        "Supabase와 SUPABASE_SERVICE_ROLE_KEY가 설정된 환경에서만 계정을 만들 수 있습니다.",
    };
  }

  const requestedUsername = normalizeUsername(input.username ?? input.displayName);
  const password = (input.password?.trim() || defaultPasswordFromPhone(input.phone)).trim();
  if (password.length < 4) {
    return { error: "비밀번호 자동 생성에 실패했습니다. 휴대폰 번호를 확인해 주세요." };
  }

  const academyId = await getAdminAcademyId(adminId);
  if (!academyId) return { error: "원장 계정의 학원 정보가 없습니다." };

  let username = requestedUsername;
  const supabase = createServiceClient();

  let suffix = 1;
  // 이름을 아이디로 사용하되, 중복 시 번호를 붙입니다.
  while (true) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!existingProfile) break;
    suffix += 1;
    username = `${requestedUsername}${suffix}`;
  }

  const email = toAuthEmail(`${academyId.slice(0, 8)}-${Date.now()}-${suffix}`);

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const emailTaken = authList?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (emailTaken) {
    return { error: "이미 사용 중인 아이디입니다." };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      display_name: input.displayName.trim(),
      username,
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "계정 생성에 실패했습니다." };
  }

  if (academyId) {
    await supabase
      .from("profiles")
      .update({
        academy_id: academyId,
        username,
        auth_email: email,
        phone: normalizePhone(input.phone),
        school_level: input.role === "student" ? input.schoolLevel : null,
        grade_number: input.role === "student" ? input.gradeNumber : null,
      })
      .eq("id", data.user.id);
  }

  const { upsertAdminVisiblePassword } = await import(
    "@/lib/server/admin/password-notes"
  );
  await upsertAdminVisiblePassword(data.user.id, password, adminId);

  return { userId: data.user.id, username, password };
}
