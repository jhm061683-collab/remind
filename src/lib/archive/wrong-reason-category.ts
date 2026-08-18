export const SYSTEM_WRONG_REASON_CATEGORIES = [
  "개념 부족",
  "계산 실수",
  "문제 해석 오류",
  "조건 누락",
  "시간 부족",
  "기타",
] as const;

export type SystemWrongReasonCategory =
  (typeof SYSTEM_WRONG_REASON_CATEGORIES)[number];

const KEYWORD_MAP: Array<{ category: SystemWrongReasonCategory; keys: string[] }> =
  [
    { category: "개념 부족", keys: ["개념", "공식", "원리", "암기"] },
    { category: "계산 실수", keys: ["계산", "연산", "실수", "부호"] },
    { category: "문제 해석 오류", keys: ["해석", "독해", "이해"] },
    { category: "조건 누락", keys: ["조건", "누락", "빠뜨", "빼먹"] },
    { category: "시간 부족", keys: ["시간", "못 품", "미완"] },
  ];

/** 학생 원문은 바꾸지 않고, 필터용 중립 분류만 고른다. */
export function categorizeWrongReason(raw: string | null | undefined): SystemWrongReasonCategory {
  const text = raw?.trim() ?? "";
  if (!text) return "기타";
  if ((SYSTEM_WRONG_REASON_CATEGORIES as readonly string[]).includes(text)) {
    return text as SystemWrongReasonCategory;
  }
  for (const row of KEYWORD_MAP) {
    if (row.keys.some((key) => text.includes(key))) return row.category;
  }
  return "기타";
}
