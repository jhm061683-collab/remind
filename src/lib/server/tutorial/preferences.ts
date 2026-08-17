import { getSession } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseUserId } from "@/lib/supabase/config";
import type { TutorialPreference } from "@/lib/tutorial/types";

export async function listTutorialPreferences(
  userId: string,
): Promise<TutorialPreference[]> {
  if (!isSupabaseUserId(userId)) return [];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_tutorial_preferences")
      .select("tutorial_key, tutorial_version, auto_hidden")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row) => ({
      tutorialKey: row.tutorial_key as string,
      tutorialVersion: Number(row.tutorial_version),
      autoHidden: Boolean(row.auto_hidden),
    }));
  } catch {
    return [];
  }
}

export async function hideTutorialPreference(input: {
  userId: string;
  tutorialKey: string;
  tutorialVersion: number;
}): Promise<{ error?: string }> {
  if (!isSupabaseUserId(input.userId)) {
    return { error: "저장할 수 없는 계정입니다." };
  }
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc("hide_tutorial_preference", {
      p_user_id: input.userId,
      p_tutorial_key: input.tutorialKey,
      p_tutorial_version: input.tutorialVersion,
    });
    if (!error) return {};

    const now = new Date().toISOString();
    const fallback = await supabase.from("user_tutorial_preferences").upsert(
      {
        user_id: input.userId,
        tutorial_key: input.tutorialKey,
        tutorial_version: input.tutorialVersion,
        auto_hidden: true,
        dismissed_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,tutorial_key,tutorial_version" },
    );
    if (fallback.error) return { error: fallback.error.message };
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "저장에 실패했습니다.",
    };
  }
}

export async function listTutorialPreferencesForSession(): Promise<TutorialPreference[]> {
  const session = await getSession();
  if (!session) return [];
  return listTutorialPreferences(session.id);
}
