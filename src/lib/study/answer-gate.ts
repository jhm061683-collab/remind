/** 답을 적었는지. 공백만 있으면 입력으로 보지 않는다. */
export function hasStudyAnswer(value: string): boolean {
  return value.trim().length > 0;
}

export type StudyRevealKind = "answered" | "gave_up";

export function canConfirmAnswer(kind: StudyRevealKind, answer: string): boolean {
  if (kind === "gave_up") return true;
  return hasStudyAnswer(answer);
}
