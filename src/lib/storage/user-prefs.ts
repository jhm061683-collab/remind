import { readJson, writeJson } from "@/lib/storage/safe-storage";

import type { StudentTheme } from "@/lib/theme/student-theme";
import { DEFAULT_STUDENT_THEME } from "@/lib/theme/student-theme";

export type ReviewUiPrefs = {
  applyToAllSubjects: boolean;
  theme: StudentTheme;
};

export const DEFAULT_REVIEW_UI_PREFS: ReviewUiPrefs = {
  applyToAllSubjects: false,
  theme: DEFAULT_STUDENT_THEME,
};

const STORAGE_KEY = "wrong-note-review-ui-prefs";

function normalizePrefs(raw: Partial<ReviewUiPrefs>): ReviewUiPrefs {
  return {
    applyToAllSubjects: Boolean(raw.applyToAllSubjects),
    theme:
      raw.theme === "remind-dark" || raw.theme === "remind-light"
        ? raw.theme
        : DEFAULT_STUDENT_THEME,
  };
}

export function getReviewUiPrefsLocal(): ReviewUiPrefs {
  const raw = readJson<Partial<ReviewUiPrefs>>(STORAGE_KEY, DEFAULT_REVIEW_UI_PREFS);
  return normalizePrefs(raw);
}

export function saveReviewUiPrefsLocal(prefs: ReviewUiPrefs): boolean {
  return writeJson(STORAGE_KEY, normalizePrefs(prefs)).ok;
}
