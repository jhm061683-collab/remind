import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";

/** 관리자 화면용 비밀번호 기록 (Auth 해시와 별도) */
export async function upsertAdminVisiblePassword(
  userId: string,
  passwordPlain: string,
  updatedBy?: string | null,
): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  const supabase = createServiceClient();
  await supabase.from("profile_password_admin").upsert(
    {
      user_id: userId,
      password_plain: passwordPlain,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: "user_id" },
  );
}

export async function getAdminVisiblePassword(
  userId: string,
): Promise<string | null> {
  if (!isServiceRoleConfigured()) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profile_password_admin")
    .select("password_plain")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.password_plain ?? null;
}

export async function getAdminVisiblePasswords(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!isServiceRoleConfigured() || userIds.length === 0) return map;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profile_password_admin")
    .select("user_id, password_plain")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    if (row.user_id && row.password_plain) {
      map.set(row.user_id as string, row.password_plain as string);
    }
  }
  return map;
}
