"use server";

import { getSession } from "@/lib/auth/session";
import { isSupabaseUserId } from "@/lib/supabase/config";
import { hideTutorialPreference } from "@/lib/server/tutorial/preferences";

export async function hideTutorialAction(input: {
  tutorialKey: string;
  tutorialVersion: number;
}): Promise<{ error?: string; ok?: true }> {
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다." };
  }
  const key = input.tutorialKey.trim();
  const version = Math.floor(input.tutorialVersion);
  if (!key || version < 1) {
    return { error: "잘못된 튜토리얼입니다." };
  }
  const result = await hideTutorialPreference({
    userId: session.id,
    tutorialKey: key,
    tutorialVersion: version,
  });
  if (result.error) return { error: result.error };
  return { ok: true };
}
