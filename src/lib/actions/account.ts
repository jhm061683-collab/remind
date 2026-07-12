"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { upsertAdminVisiblePassword } from "@/lib/server/admin/password-notes";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ChangePasswordState = {
  error?: string;
  success?: string;
};

export async function changeOwnPasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

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

  await upsertAdminVisiblePassword(session.id, nextPassword, session.id);
  revalidatePath("/account");
  return { success: "비밀번호를 변경했습니다. 관리자 화면에도 반영됩니다." };
}
