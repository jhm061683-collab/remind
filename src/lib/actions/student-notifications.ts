"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { markStudentNotificationsRead } from "@/lib/server/student/notifications";
import { isSupabaseUserId } from "@/lib/supabase/config";

export async function markNotificationsReadAction(
  ids?: string[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "student" || !isSupabaseUserId(session.id)) {
    return { error: "권한이 없습니다." };
  }

  await markStudentNotificationsRead(session.id, ids);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return {};
}
