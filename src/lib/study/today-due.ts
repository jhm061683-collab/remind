import { toDateKey } from "../utils/date-range";

export type TodayDueQuestion = {
  phase?: string | null;
  archived?: boolean | null;
  nextReviewDate: string;
};

/** 오늘 복습 대상: 완료·보관이 아니고 nextReviewDate가 KST 오늘 이하 */
export function isDueTodayOrOverdue(
  question: TodayDueQuestion,
  now = new Date(),
): boolean {
  if (question.phase === "completed" || question.archived) return false;
  return toDateKey(new Date(question.nextReviewDate)) <= toDateKey(now);
}

export function isOverdue(question: TodayDueQuestion, now = new Date()): boolean {
  if (question.phase === "completed" || question.archived) return false;
  return toDateKey(new Date(question.nextReviewDate)) < toDateKey(now);
}

export function countTodayDue(
  questions: TodayDueQuestion[],
  now = new Date(),
): number {
  return questions.filter((q) => isDueTodayOrOverdue(q, now)).length;
}
