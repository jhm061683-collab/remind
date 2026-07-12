import type { AnswerResult, CompletedAction, Question } from "@/types/question";
import type { ReviewSettings } from "@/types/subject";

/**
 * 문제를 푼 결과에 따라 다음 노출일과 단계를 계산합니다.
 * - 틀리면: 단기로 되돌리고 1일 후 재노출
 * - 맞으면: 연속 정답 횟수에 따라 단기→중기→장기 전환
 * - 장기 완료 후: 삭제/보관/한 번 더 노출 선택
 */
export function calculateNextReview(
  question: Question,
  result: AnswerResult,
  settings: ReviewSettings,
  completedAction?: CompletedAction,
): Pick<Question, "phase" | "streakCount" | "nextReviewDate"> {
  const answeredAt = new Date();

  if (result === "incorrect") {
    return {
      phase: "short",
      streakCount: 0,
      nextReviewDate: addDays(answeredAt, settings.shortIntervalDays),
    };
  }

  const nextStreak = question.streakCount + 1;

  if (question.phase === "short" && nextStreak >= settings.shortStreakRequired) {
    return {
      phase: "medium",
      streakCount: 0,
      nextReviewDate: addDays(answeredAt, settings.mediumIntervalDays),
    };
  }

  if (question.phase === "medium" && nextStreak >= settings.mediumStreakRequired) {
    return {
      phase: "long",
      streakCount: 0,
      nextReviewDate: addDays(answeredAt, settings.longIntervalDays),
    };
  }

  if (question.phase === "long" && nextStreak >= settings.longStreakRequired) {
    if (completedAction === "review_once_more") {
      return {
        phase: "long",
        streakCount: 0,
        nextReviewDate: addDays(answeredAt, settings.longIntervalDays),
      };
    }
    return {
      phase: "completed",
      streakCount: nextStreak,
      nextReviewDate: answeredAt,
    };
  }

  const interval =
    question.phase === "short"
      ? settings.shortIntervalDays
      : question.phase === "medium"
        ? settings.mediumIntervalDays
        : settings.longIntervalDays;

  return {
    phase: question.phase,
    streakCount: nextStreak,
    nextReviewDate: addDays(answeredAt, interval),
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
