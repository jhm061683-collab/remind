export const SUBJECT_IDS = ["math", "english", "korean"] as const;

export const SUBJECT_NAMES: Record<string, string> = {
  math: "수학",
  english: "영어",
  korean: "국어",
};

/**
 * 커스텀 과목 id(sub-새과목-mr8tmpqv)에서 사람이 읽을 이름을 추출한다.
 */
export function humanizeSubjectId(subjectId: string): string {
  const known = SUBJECT_NAMES[subjectId];
  if (known) return known;
  const match = /^sub-(.+)-[a-z0-9]+$/i.exec(subjectId.trim());
  if (match?.[1]) {
    const raw = match[1].replace(/-/g, " ").trim();
    return raw || "새 과목";
  }
  return subjectId;
}

export function getSubjectName(
  subjectId: string,
  nameById?: Record<string, string> | Map<string, string>,
): string {
  if (nameById) {
    const mapped =
      nameById instanceof Map ? nameById.get(subjectId) : nameById[subjectId];
    if (mapped?.trim()) return mapped.trim();
  }
  return humanizeSubjectId(subjectId);
}
