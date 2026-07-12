import type { ReviewPhase } from "./subject";

export type Question = {
  id: string;
  subjectId: string;
  userId: string;
  imageUrl: string;
  answerText?: string;
  createdAt: Date;
  phase: ReviewPhase;
  streakCount: number;
  nextReviewDate: Date;
  lastAnsweredAt?: Date;
};

export type AnswerResult = "correct" | "incorrect";

export type CompletedAction = "delete" | "archive" | "review_once_more";
