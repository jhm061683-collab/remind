import type { ReviewSettings } from "@/types/subject";

export type ReviewPreset = {
  id: string;
  name: string;
  description: string;
  settings: ReviewSettings;
};

export const DEFAULT_REVIEW_PRESETS: ReviewPreset[] = [
  {
    id: "suneung",
    name: "수능·모의고사",
    description: "단기 1일(×3) → 중기 7일(×3) → 장기 14일(×1)",
    settings: {
      shortIntervalDays: 1,
      shortStreakRequired: 3,
      mediumIntervalDays: 7,
      mediumStreakRequired: 3,
      longIntervalDays: 14,
      longStreakRequired: 1,
    },
  },
  {
    id: "naeshin",
    name: "내신",
    description: "단기 1일(×2) → 중기 5일(×2) → 장기 10일(×1)",
    settings: {
      shortIntervalDays: 1,
      shortStreakRequired: 2,
      mediumIntervalDays: 5,
      mediumStreakRequired: 2,
      longIntervalDays: 10,
      longStreakRequired: 1,
    },
  },
  {
    id: "gongsi",
    name: "공시·국가시험",
    description: "단기 1일(×3) → 중기 7일(×3) → 장기 30일(×1)",
    settings: {
      shortIntervalDays: 1,
      shortStreakRequired: 3,
      mediumIntervalDays: 7,
      mediumStreakRequired: 3,
      longIntervalDays: 30,
      longStreakRequired: 1,
    },
  },
];

export function buildSettingsSummary(settings: ReviewSettings): string {
  return `단기 ${settings.shortIntervalDays}일(×${settings.shortStreakRequired}) → 중기 ${settings.mediumIntervalDays}일(×${settings.mediumStreakRequired}) → 장기 ${settings.longIntervalDays}일(×${settings.longStreakRequired})`;
}

/** @deprecated use custom-presets.ts */
export const REVIEW_PRESETS = DEFAULT_REVIEW_PRESETS;
