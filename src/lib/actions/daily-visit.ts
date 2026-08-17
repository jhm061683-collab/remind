"use server";

import { getSession } from "@/lib/auth/session";
import { recordDailyVisitOnServer } from "@/lib/server/record-daily-visit";
import { isSupabaseUserId } from "@/lib/supabase/config";

/** 학생 앱 진입 시 하루 1회 출석 기록 */
export async function recordDailyVisitAction(): Promise<{ recorded: boolean }> {
  const session = await getSession();
  if (
    !session ||
    session.role !== "student" ||
    !isSupabaseUserId(session.id)
  ) {
    return { recorded: false };
  }

  const recorded = await recordDailyVisitOnServer(session.id);
  return { recorded };
}
