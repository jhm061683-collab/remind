import { createClient } from "@/lib/supabase/client";
import type { ReviewUiPrefs } from "@/lib/storage/user-prefs";
import { DEFAULT_REVIEW_UI_PREFS } from "@/lib/storage/user-prefs";
import {
  DEFAULT_SUBJECTS,
  type UserSubject,
} from "@/lib/storage/user-subjects";

const SUBJECTS_KEY = "__subjects__";
const PREFS_KEY = "__ui_prefs__";

export async function getUserSubjectsDb(userId: string): Promise<UserSubject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("subject_id", SUBJECTS_KEY)
    .maybeSingle();

  if (error) throw error;
  const subjects = (data?.settings as { subjects?: UserSubject[] } | null)
    ?.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0) return DEFAULT_SUBJECTS;
  return subjects.map((s) => ({ id: s.id, name: s.name.trim() }));
}

export async function saveUserSubjectsDb(
  userId: string,
  subjects: UserSubject[],
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: SUBJECTS_KEY,
      settings: { subjects },
    },
    { onConflict: "user_id,subject_id" },
  );
  return !error;
}

export async function getReviewUiPrefsDb(
  userId: string,
): Promise<ReviewUiPrefs> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("subject_id", PREFS_KEY)
    .maybeSingle();

  if (error) throw error;
  const prefs = data?.settings as Partial<ReviewUiPrefs> | null;
  if (!prefs) return DEFAULT_REVIEW_UI_PREFS;
  return {
    applyToAllSubjects: Boolean(prefs.applyToAllSubjects),
    theme:
      prefs.theme === "remind-dark" || prefs.theme === "remind-light"
        ? prefs.theme
        : DEFAULT_REVIEW_UI_PREFS.theme,
  };
}

export async function saveReviewUiPrefsDb(
  userId: string,
  prefs: ReviewUiPrefs,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: PREFS_KEY,
      settings: prefs,
    },
    { onConflict: "user_id,subject_id" },
  );
  return !error;
}
