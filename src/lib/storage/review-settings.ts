import type { ReviewSettings } from "@/types/subject";
import { SUBJECT_IDS } from "@/lib/subjects";
import { readJson, writeJson } from "@/lib/storage/safe-storage";

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  shortIntervalDays: 1,
  shortStreakRequired: 3,
  mediumIntervalDays: 7,
  mediumStreakRequired: 3,
  longIntervalDays: 14,
  longStreakRequired: 1,
};

/** 입력 가능 범위 — 이 범위를 넘기면 복습 로직에 반영되지 않을 수 있어 자동 보정됩니다. */
export const REVIEW_SETTINGS_LIMITS = {
  shortIntervalDays: { min: 1, max: 30 },
  shortStreakRequired: { min: 1, max: 10 },
  mediumIntervalDays: { min: 1, max: 60 },
  mediumStreakRequired: { min: 1, max: 10 },
  longIntervalDays: { min: 1, max: 90 },
  longStreakRequired: { min: 1, max: 10 },
} as const;

const STORAGE_KEY = "wrong-note-review-settings";
export const GLOBAL_SETTINGS_KEY = "__global__";

export const REVIEW_SETTINGS_UPDATED = "review-settings-updated";

export function sanitizeSettings(settings: ReviewSettings): ReviewSettings {
  const limits = REVIEW_SETTINGS_LIMITS;
  return {
    shortIntervalDays: clamp(
      settings?.shortIntervalDays,
      limits.shortIntervalDays.min,
      limits.shortIntervalDays.max,
      DEFAULT_REVIEW_SETTINGS.shortIntervalDays,
    ),
    shortStreakRequired: clamp(
      settings?.shortStreakRequired,
      limits.shortStreakRequired.min,
      limits.shortStreakRequired.max,
      DEFAULT_REVIEW_SETTINGS.shortStreakRequired,
    ),
    mediumIntervalDays: clamp(
      settings?.mediumIntervalDays,
      limits.mediumIntervalDays.min,
      limits.mediumIntervalDays.max,
      DEFAULT_REVIEW_SETTINGS.mediumIntervalDays,
    ),
    mediumStreakRequired: clamp(
      settings?.mediumStreakRequired,
      limits.mediumStreakRequired.min,
      limits.mediumStreakRequired.max,
      DEFAULT_REVIEW_SETTINGS.mediumStreakRequired,
    ),
    longIntervalDays: clamp(
      settings?.longIntervalDays,
      limits.longIntervalDays.min,
      limits.longIntervalDays.max,
      DEFAULT_REVIEW_SETTINGS.longIntervalDays,
    ),
    longStreakRequired: clamp(
      settings?.longStreakRequired,
      limits.longStreakRequired.min,
      limits.longStreakRequired.max,
      DEFAULT_REVIEW_SETTINGS.longStreakRequired,
    ),
  };
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function readAllSettings(): Record<string, ReviewSettings> {
  const raw = readJson<Record<string, ReviewSettings>>(STORAGE_KEY, {});
  const normalized: Record<string, ReviewSettings> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object") {
      normalized[key] = sanitizeSettings(value);
    }
  }
  return normalized;
}

function writeAllSettings(all: Record<string, ReviewSettings>): boolean {
  return writeJson(STORAGE_KEY, all).ok;
}

/** 모든 과목에 동일한 설정이 적용되는지 확인 */
export function isUnifiedSettings(): boolean {
  const all = readAllSettings();
  const global = all[GLOBAL_SETTINGS_KEY];
  if (!global) return false;

  return SUBJECT_IDS.every((id) => {
    const subject = all[id];
    return (
      !subject ||
      JSON.stringify(subject) === JSON.stringify(global)
    );
  });
}

export function getReviewSettings(subjectId: string): ReviewSettings {
  if (typeof window === "undefined") return DEFAULT_REVIEW_SETTINGS;

  const all = readAllSettings();

  // 과목별 설정 우선, 없으면 전체 공통(__global__) 설정
  if (all[subjectId]) {
    return all[subjectId];
  }

  if (all[GLOBAL_SETTINGS_KEY]) {
    return all[GLOBAL_SETTINGS_KEY];
  }

  return DEFAULT_REVIEW_SETTINGS;
}

export function saveReviewSettings(
  subjectId: string,
  settings: ReviewSettings,
  applyToAllSubjects = true,
  allSubjectIds: string[] = [...SUBJECT_IDS],
): boolean {
  if (typeof window === "undefined") return false;

  const sanitized = sanitizeSettings(settings);
  const all = readAllSettings();

  if (applyToAllSubjects) {
    all[GLOBAL_SETTINGS_KEY] = sanitized;
    for (const id of allSubjectIds) {
      all[id] = sanitized;
    }
  } else {
    all[subjectId] = sanitized;
  }

  const ok = writeAllSettings(all);
  if (!ok) return false;

  try {
    window.dispatchEvent(
      new CustomEvent(REVIEW_SETTINGS_UPDATED, {
        detail: { subjectId, applyToAllSubjects },
      }),
    );
  } catch {
    // 일부 구형 브라우저에서 CustomEvent 실패해도 저장은 유지
  }
  return true;
}

export function parseSettingNumber(value: string): number | null {
  const parsed = parseInt(value.replace(/\D/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

/** @deprecated blur 확정 방식에서는 parseSettingNumber 사용 */
export function parseSettingNumberWithFallback(
  value: string,
  fallback: number,
): number {
  return parseSettingNumber(value) ?? fallback;
}

export function getSettingsShortLabel(settings: ReviewSettings): string {
  const s = sanitizeSettings(settings);
  return `단기 ${s.shortIntervalDays}일 · 중기 ${s.mediumIntervalDays}일 · 장기 ${s.longIntervalDays}일`;
}
