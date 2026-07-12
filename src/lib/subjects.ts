export const SUBJECT_IDS = ["math", "english", "korean"] as const;

export const SUBJECT_NAMES: Record<string, string> = {
  math: "수학",
  english: "영어",
  korean: "국어",
};

export function getSubjectName(subjectId: string): string {
  return SUBJECT_NAMES[subjectId] ?? subjectId;
}
