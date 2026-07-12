import { createClient } from "@/lib/supabase/server";
import type { ReviewUiPrefs } from "@/lib/storage/user-prefs";
import { DEFAULT_REVIEW_UI_PREFS } from "@/lib/storage/user-prefs";
import {
  DEFAULT_SUBJECTS,
  type UserSubject,
} from "@/lib/storage/user-subjects";

const SUBJECTS_KEY = "__subjects__";
const PREFS_KEY = "__ui_prefs__";

export async function getUserSubjectsOnServer(
  userId: string,
): Promise<UserSubject[]> {
  const supabase = await createClient();
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

export async function saveUserSubjectsOnServer(
  userId: string,
  subjects: UserSubject[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: SUBJECTS_KEY,
      settings: { subjects },
    },
    { onConflict: "user_id,subject_id" },
  );
  if (error) throw error;
}

export async function getReviewUiPrefsOnServer(
  userId: string,
): Promise<ReviewUiPrefs> {
  const supabase = await createClient();
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

export async function saveReviewUiPrefsOnServer(
  userId: string,
  prefs: ReviewUiPrefs,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: PREFS_KEY,
      settings: prefs,
    },
    { onConflict: "user_id,subject_id" },
  );
  if (error) throw error;
}
