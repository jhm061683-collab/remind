export type StaffAccessReason = "primary" | "co" | "class" | "academy";

export function missingStaffProfileIds(
  knownIds: Iterable<string>,
  referencedIds: Iterable<string>,
): string[] {
  const known = new Set(knownIds);
  return [...new Set(referencedIds)].filter((id) => id && !known.has(id));
}

export function staffAccessLabel(reason: StaffAccessReason): string {
  if (reason === "primary") return "주 담당";
  if (reason === "co") return "공동 담당";
  if (reason === "class") return "반 담당";
  return "학원 전체";
}

/** 반 선생님 목록과 직접 배정 이름을 구분해 표시한다. */
export function describeStaffing(input: {
  teacherNames: string[];
  subAdminName: string | null;
}): { primary: string | null; others: string[]; label: string } {
  const unique = [...new Set(input.teacherNames.filter(Boolean))];
  const primary = input.subAdminName?.trim() || unique[0] || null;
  const others = unique.filter((name) => name !== primary);
  if (!primary && others.length === 0) {
    return { primary: null, others: [], label: "미배정" };
  }
  if (others.length === 0) {
    return { primary, others: [], label: `주 담당 ${primary}` };
  }
  return {
    primary,
    others,
    label: `주 담당 ${primary} · 공동 ${others.join(", ")}`,
  };
}
