import { recordActivity } from "@/lib/data/activity";
import { calculateNextReview } from "@/lib/scheduling/review-scheduler";
import { getReviewSettings } from "@/lib/data/review-settings";
import {
  deleteQuestion,
  type StoredQuestion,
  updateQuestion,
} from "@/lib/data/questions";
import type { AnswerResult, CompletedAction, Question } from "@/types/question";

export async function willCompleteLongPhase(
  userId: string,
  question: StoredQuestion,
  result: AnswerResult,
): Promise<boolean> {
  if (result !== "correct" || question.phase !== "long") return false;
  const settings = await getReviewSettings(userId, question.subjectId);
  return question.streakCount + 1 >= settings.longStreakRequired;
}

export async function submitAnswer(
  userId: string,
  question: StoredQuestion,
  result: AnswerResult,
  completedAction?: CompletedAction,
): Promise<StoredQuestion | null> {
  const settings = await getReviewSettings(userId, question.subjectId);
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
    await deleteQuestion(userId, question.id);
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

  const updated = await updateQuestion(userId, question.id, patch);

  await recordActivity(userId, {
    type: "reviewed",
    questionId: question.id,
    wrongReason: question.wrongReason,
  });

  if (completedAction === "archive" && next.phase === "completed") {
    await recordActivity(userId, {
      type: "archived",
      questionId: question.id,
    });
  }

  return updated;
}

export async function getStreakTarget(
  userId: string,
  question: StoredQuestion,
): Promise<number> {
  const settings = await getReviewSettings(userId, question.subjectId);
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
