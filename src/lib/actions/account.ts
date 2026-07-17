"use server";

import { revalidatePath } from "next/cache";
import { formatStaffLabel } from "@/lib/admin/staff-label";
import { getSession, setSession } from "@/lib/auth/session";
import { requireStaff } from "@/lib/server/admin/auth";
import { upsertAdminVisiblePassword } from "@/lib/server/admin/password-notes";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ChangePasswordState = {
  error?: string;
  success?: string;
};

export async function updateOwnStaffProfileAction(payload: {
  displayName: string;
  nickname?: string;
}): Promise<{ error?: string; success?: string }> {
  const session = await requireStaff();
  const displayName = payload.displayName.trim();
  if (displayName.length < 2) {
    return { error: "이름은 2자 이상 입력해 주세요." };
  }

  const nickname = payload.nickname?.trim() || null;
  const supabase = createServiceClient();
  const patch: {
    display_name: string;
    nickname: string | null;
    is_director?: boolean;
  } = {
    display_name: displayName,
    nickname,
  };
  if (session.role === "admin") {
    patch.is_director = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", session.id);
  if (error) return { error: error.message };

  const labeled = formatStaffLabel({
    displayName,
    nickname,
    role: session.role,
    isDirector: session.role === "admin" || Boolean(session.isDirector),
  });

  await setSession({
    ...session,
    name: labeled,
    isDirector: session.role === "admin" ? true : session.isDirector,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/account");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `표시 이름을 「${labeled}」으로 저장했습니다.` };
}

export async function changeOwnPasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const revalidateTarget =
    String(formData.get("revalidatePath") ?? "").trim() || "/account";
  const successHint =
    String(formData.get("successHint") ?? "").trim() ||
    "비밀번호를 변경했습니다. 관리자 화면에도 반영됩니다.";

  if (!currentPassword || !nextPassword) {
    return { error: "현재 비밀번호와 새 비밀번호를 입력해 주세요." };
  }
  if (nextPassword.length < 4) {
    return { error: "새 비밀번호는 4자 이상으로 입력해 주세요." };
  }
  if (nextPassword !== confirmPassword) {
    return { error: "새 비밀번호 확인이 일치하지 않습니다." };
  }
  if (currentPassword === nextPassword) {
    return { error: "현재 비밀번호와 다른 비밀번호로 바꿔 주세요." };
  }

  if (!isSupabaseEnabled()) {
    return { error: "클라우드 로그인 환경에서만 비밀번호를 변경할 수 있습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return { error: "로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: nextPassword,
  });
  if (updateError) {
    return { error: updateError.message || "비밀번호 변경에 실패했습니다." };
  }

  if (session.role === "student") {
    await upsertAdminVisiblePassword(session.id, nextPassword, session.id);
  }

  revalidatePath(revalidateTarget);
  return { success: successHint };
}
