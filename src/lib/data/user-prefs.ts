import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbMeta from "@/lib/db/user-meta";
import {
  DEFAULT_REVIEW_UI_PREFS,
  getReviewUiPrefsLocal,
  saveReviewUiPrefsLocal,
  type ReviewUiPrefs,
} from "@/lib/storage/user-prefs";

export type { ReviewUiPrefs };
export { DEFAULT_REVIEW_UI_PREFS };

export async function getReviewUiPrefs(userId: string): Promise<ReviewUiPrefs> {
  if (isSupabaseEnabled()) {
    return dbMeta.getReviewUiPrefsDb(userId);
  }
  return Promise.resolve(getReviewUiPrefsLocal());
}

export async function saveReviewUiPrefs(
  userId: string,
  prefs: ReviewUiPrefs,
): Promise<boolean> {
  if (isSupabaseEnabled()) {
    return dbMeta.saveReviewUiPrefsDb(userId, prefs);
  }
  return Promise.resolve(saveReviewUiPrefsLocal(prefs));
}
