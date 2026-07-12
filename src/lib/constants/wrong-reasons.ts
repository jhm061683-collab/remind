export const WRONG_REASONS = [
  "조건 오독",
  "연산 실수",
  "개념 부족",
  "시간 부족",
  "풀이 전략 부족",
  "기타",
] as const;

export type WrongReason = (typeof WRONG_REASONS)[number];
