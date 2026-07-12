import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbSettings from "@/lib/db/review-settings";
import * as localSettings from "@/lib/storage/review-settings";
import type { ReviewSettings } from "@/types/subject";

const { REVIEW_SETTINGS_UPDATED } = localSettings;

export {
  DEFAULT_REVIEW_SETTINGS,
  REVIEW_SETTINGS_LIMITS,
  REVIEW_SETTINGS_UPDATED,
  getSettingsShortLabel,
  parseSettingNumber,
  sanitizeSettings,
} from "@/lib/storage/review-settings";

export async function getReviewSettings(userId: string, subjectId: string) {
  if (isSupabaseEnabled()) {
    return dbSettings.getReviewSettings(userId, subjectId);
  }
  return Promise.resolve(localSettings.getReviewSettings(subjectId));
}

export async function saveReviewSettings(
  userId: string,
  subjectId: string,
  settings: ReviewSettings,
  applyToAllSubjects = true,
  allSubjectIds?: string[],
) {
  if (isSupabaseEnabled()) {
    const ok = await dbSettings.saveReviewSettings(
      userId,
      subjectId,
      settings,
      applyToAllSubjects,
      allSubjectIds,
    );
    if (ok) {
      try {
        window.dispatchEvent(
          new CustomEvent(REVIEW_SETTINGS_UPDATED, {
            detail: { subjectId, applyToAllSubjects },
          }),
        );
      } catch {
        // ignore
      }
    }
    return ok;
  }
  return Promise.resolve(
    localSettings.saveReviewSettings(
      subjectId,
      settings,
      applyToAllSubjects,
      allSubjectIds,
    ),
  );
}
