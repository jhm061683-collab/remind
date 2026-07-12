import { calculateNextReview } from "@/lib/scheduling/review-scheduler";
import { getReviewSettings } from "@/lib/storage/review-settings";
import {
  deleteQuestion,
  type StoredQuestion,
  updateQuestion,
} from "@/lib/storage/questions";
import type { AnswerResult, CompletedAction } from "@/types/question";
import type { Question } from "@/types/question";

export function willCompleteLongPhase(
  question: StoredQuestion,
  result: AnswerResult,
): boolean {
  if (result !== "correct" || question.phase !== "long") return false;
  const settings = getReviewSettings(question.subjectId);
  return question.streakCount + 1 >= settings.longStreakRequired;
}

export function submitAnswer(
  question: StoredQuestion,
  result: AnswerResult,
  completedAction?: CompletedAction,
): StoredQuestion | null {
  const settings = getReviewSettings(question.subjectId);
  const asQuestion: Question = {
    id: question.id,
    subjectId: question.subjectId,
    userId: question.userId,
    imageUrl: question.imageDataUrl,
    answerText: question.answerText,
    createdAt: new Date(question.createdAt),
    phase: question.phase,
    streakCount: question.streakCount,
    nextReviewDate: new Date(question.nextReviewDate),
    lastAnsweredAt: question.lastAnsweredAt
      ? new Date(question.lastAnsweredAt)
      : undefined,
  };

  if (completedAction === "delete") {
    deleteQuestion(question.id);
    return null;
  }

  const next = calculateNextReview(
    asQuestion,
    result,
    settings,
    completedAction,
  );

  const patch: Partial<StoredQuestion> = {
    phase: next.phase,
    streakCount: next.streakCount,
    nextReviewDate: next.nextReviewDate.toISOString(),
    lastAnsweredAt: new Date().toISOString(),
  };

  if (completedAction === "archive" && next.phase === "completed") {
    patch.archived = true;
  }

  return updateQuestion(question.id, patch);
}

export function getStreakTarget(question: StoredQuestion): number {
  const settings = getReviewSettings(question.subjectId);
  switch (question.phase) {
    case "short":
      return settings.shortStreakRequired;
    case "medium":
      return settings.mediumStreakRequired;
    case "long":
      return settings.longStreakRequired;
    default:
      return 0;
  }
}
