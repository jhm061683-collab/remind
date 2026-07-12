"use server";

import { getSession } from "@/lib/auth/session";
import {
  getReviewUiPrefsOnServer,
  saveReviewUiPrefsOnServer,
} from "@/lib/server/user-meta";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";
import {
  DEFAULT_STUDENT_THEME,
  isStudentTheme,
  type StudentTheme,
} from "@/lib/theme/student-theme";

export async function saveStudentThemeAction(
  theme: StudentTheme,
): Promise<{ error?: string }> {
  if (!isStudentTheme(theme)) {
    return { error: "잘못된 테마입니다." };
  }

  if (!isSupabaseEnabled()) return {};

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return {};
  }

  try {
    const prefs = await getReviewUiPrefsOnServer(session.id);
    await saveReviewUiPrefsOnServer(session.id, { ...prefs, theme });
    return {};
  } catch (err) {
    console.error("[saveStudentThemeAction]", err);
    return { error: "테마 저장 실패" };
  }
}

export async function getStudentThemeOnServer(
  userId: string,
): Promise<StudentTheme> {
  if (!isSupabaseEnabled() || !isSupabaseUserId(userId)) {
    return DEFAULT_STUDENT_THEME;
  }

  try {
    const prefs = await getReviewUiPrefsOnServer(userId);
    return prefs.theme;
  } catch {
    return DEFAULT_STUDENT_THEME;
  }
}
