import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbQuestions from "@/lib/db/questions";
import * as localQuestions from "@/lib/storage/questions";

export type { StoredQuestion } from "@/lib/storage/questions";
export {
  StorageBlockedError,
  StorageQuotaError,
} from "@/lib/storage/questions";

export async function getQuestionsBySubject(
  userId: string,
  subjectId: string,
) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getQuestionsBySubject(userId, subjectId);
  }
  return Promise.resolve(localQuestions.getQuestionsBySubject(subjectId));
}

export async function getQuestionCountBySubject(
  userId: string,
  subjectId: string,
) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getQuestionCountBySubject(userId, subjectId);
  }
  return Promise.resolve(localQuestions.getQuestionCountBySubject(subjectId));
}

export async function getTodayReviewQuestions(
  userId: string,
  subjectId?: string,
  today?: Date,
) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getTodayReviewQuestions(userId, subjectId, today);
  }
  return Promise.resolve(
    localQuestions.getTodayReviewQuestions(subjectId, today),
  );
}

export async function getArchivedQuestions(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getArchivedQuestions(userId);
  }
  return Promise.resolve(localQuestions.getArchivedQuestions());
}

export async function getAllQuestions(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getAllQuestions(userId);
  }
  return Promise.resolve(localQuestions.getAllQuestions());
}

/** 학생 홈 전용 — 본문/이미지 없이 메타만 */
export async function getHomeQuestionMeta(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getHomeQuestionMeta(userId);
  }
  return Promise.resolve(localQuestions.getAllQuestions());
}

export async function getUpcomingReviewQuestions(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getUpcomingReviewQuestions(userId);
  }
  return Promise.resolve(localQuestions.getUpcomingReviewQuestions());
}

export async function getUpcomingReviewCount(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.getUpcomingReviewCount(userId);
  }
  const upcoming = await localQuestions.getUpcomingReviewQuestions();
  return upcoming.length;
}

export async function saveQuestion(
  userId: string,
  input: Parameters<typeof localQuestions.saveQuestion>[0],
) {
  if (isSupabaseEnabled()) {
    return dbQuestions.saveQuestion(userId, { ...input, userId });
  }
  const question = localQuestions.saveQuestion(input);
  const { recordActivity } = await import("@/lib/data/activity");
  await recordActivity(userId, {
    type: "registered",
    questionId: question.id,
    wrongReason: input.wrongReason,
  });
  return question;
}

export async function updateQuestion(
  userId: string,
  id: string,
  patch: Parameters<typeof localQuestions.updateQuestion>[1],
) {
  if (isSupabaseEnabled()) {
    return dbQuestions.updateQuestion(userId, id, patch);
  }
  return Promise.resolve(localQuestions.updateQuestion(id, patch));
}

export async function deleteQuestion(userId: string, id: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.deleteQuestion(userId, id);
  }
  localQuestions.deleteQuestion(id);
  return Promise.resolve();
}

export async function deleteQuestionsBulk(userId: string, ids: string[]) {
  if (isSupabaseEnabled()) {
    return dbQuestions.deleteQuestionsBulk(userId, ids);
  }
  return Promise.resolve(localQuestions.deleteQuestionsBulk(ids));
}

export async function bringAllReviewsToToday(userId: string) {
  if (isSupabaseEnabled()) {
    return dbQuestions.bringAllReviewsToToday(userId);
  }
  return Promise.resolve(localQuestions.bringAllReviewsToToday());
}
