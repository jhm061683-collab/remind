/** 전 과목 공통 기본 틀린 이유 (대치동 강사 관점) */
export const DEFAULT_WRONG_REASONS = [
  "발문·조건 오독",
  "핵심 개념 부족",
  "단순 실수(계산·표기·문법)",
  "풀이·서술 전략 부족",
  "시간 배분 실패",
  "선지·보기 함정",
  "암기·어휘 부족",
  "지문·자료 해석 실패",
  "검토·검산 누락",
  "기타",
] as const;

/** @deprecated 하위 호환 — DEFAULT_WRONG_REASONS 사용 */
export const WRONG_REASONS = DEFAULT_WRONG_REASONS;

export type DefaultWrongReason = (typeof DEFAULT_WRONG_REASONS)[number];

export function mergeWrongReasonOptions(custom: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const reason of [...DEFAULT_WRONG_REASONS, ...custom]) {
    const trimmed = reason.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
