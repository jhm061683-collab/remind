import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_REVIEW_SETTINGS,
  GLOBAL_SETTINGS_KEY,
  sanitizeSettings,
} from "@/lib/storage/review-settings";
import { SUBJECT_IDS } from "@/lib/subjects";
import type { ReviewSettings } from "@/types/subject";

const META_KEYS = new Set(["__global__", "__subjects__", "__ui_prefs__"]);

export async function getReviewSettings(
  userId: string,
  subjectId: string,
): Promise<ReviewSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("subject_id, settings")
    .eq("user_id", userId);

  if (error) throw error;

  const rows = (data ?? []).filter((r) => !META_KEYS.has(r.subject_id));
  const subject = rows.find((r) => r.subject_id === subjectId);
  if (subject?.settings) {
    return sanitizeSettings(subject.settings as ReviewSettings);
  }

  const global = (data ?? []).find((r) => r.subject_id === GLOBAL_SETTINGS_KEY);
  if (global?.settings) {
    return sanitizeSettings(global.settings as ReviewSettings);
  }

  return DEFAULT_REVIEW_SETTINGS;
}

export async function saveReviewSettings(
  userId: string,
  subjectId: string,
  settings: ReviewSettings,
  applyToAllSubjects: boolean,
  allSubjectIds: string[] = [...SUBJECT_IDS],
): Promise<boolean> {
  const supabase = createClient();
  const sanitized = sanitizeSettings(settings);

  if (applyToAllSubjects) {
    const rows = [
      { user_id: userId, subject_id: GLOBAL_SETTINGS_KEY, settings: sanitized },
      ...allSubjectIds.map((sid) => ({
        user_id: userId,
        subject_id: sid,
        settings: sanitized,
      })),
    ];

    const { error } = await supabase
      .from("review_settings")
      .upsert(rows, { onConflict: "user_id,subject_id" });

    return !error;
  }

  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: subjectId,
      settings: sanitized,
    },
    { onConflict: "user_id,subject_id" },
  );

  return !error;
}
