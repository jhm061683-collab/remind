import type { ReviewPhase } from "@/types/subject";
import { getReviewSettings } from "@/lib/storage/review-settings";
import { readJson, writeJson } from "@/lib/storage/safe-storage";
import { createId } from "@/lib/utils/create-id";

export type StoredQuestion = {
  id: string;
  subjectId: string;
  userId: string;
  imageDataUrl: string;
  /** 2번째 이후 문제 사진 (각각 따로 표시) */
  extraImageDataUrls?: string[];
  answerText?: string;
  answerImageDataUrl?: string;
  keywords: string[];
  /** 문제 출처 — 예: 26년 6월 모평 22번 */
  source?: string;
  /** 틀린 이유 분류 (검색용 키워드와 별도) */
  wrongReason?: string;
  /** 틀린 이유 세부내용 — 보관함 검색 키워드로도 사용 */
  wrongReasonDetail?: string;
  /** 나만의 오답 분석 — 모르는 개념, 왜 틀렸는지 */
  reflectionMemo?: string;
  createdAt: string;
  phase: ReviewPhase;
  streakCount: number;
  nextReviewDate: string;
  lastAnsweredAt?: string;
  archived?: boolean;
};

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export class StorageBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageBlockedError";
  }
}

const STORAGE_KEY = "wrong-note-questions";

function readAll(): StoredQuestion[] {
  if (typeof window === "undefined") return [];
  const parsed = readJson<StoredQuestion[]>(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeQuestion);
}

function writeAll(questions: StoredQuestion[]) {
  const result = writeJson(STORAGE_KEY, questions);
  if (result.ok) return;
  if (result.reason === "quota") {
    throw new StorageQuotaError(result.message);
  }
  throw new StorageBlockedError(result.message);
}

export function getQuestionsBySubject(subjectId: string): StoredQuestion[] {
  return readAll().filter((q) => q.subjectId === subjectId);
}

export function getQuestionCountBySubject(subjectId: string): number {
  return getQuestionsBySubject(subjectId).length;
}

export function getTodayReviewQuestions(
  subjectId?: string,
  today = new Date(),
): StoredQuestion[] {
  const todayKey = toDateKey(today);
  return readAll().filter((question) => {
    if (question.phase === "completed") return false;
    if (question.archived) return false;
    if (subjectId && question.subjectId !== subjectId) return false;
    return toDateKey(new Date(question.nextReviewDate)) <= todayKey;
  });
}

export function getArchivedQuestions(): StoredQuestion[] {
  return readAll().filter((q) => q.archived || q.phase === "completed");
}

export function getAllQuestions(): StoredQuestion[] {
  return readAll();
}

export function saveQuestion(
  input: Omit<
    StoredQuestion,
    | "id"
    | "createdAt"
    | "phase"
    | "streakCount"
    | "nextReviewDate"
    | "lastAnsweredAt"
    | "archived"
  >,
): StoredQuestion {
  const createdAt = new Date();
  const settings = getReviewSettings(input.subjectId);
  const nextReviewDate = new Date(createdAt);
  nextReviewDate.setDate(
    nextReviewDate.getDate() + settings.shortIntervalDays,
  );

  const question: StoredQuestion = {
    ...input,
    id: createId("q"),
    createdAt: createdAt.toISOString(),
    phase: "short",
    streakCount: 0,
    nextReviewDate: nextReviewDate.toISOString(),
  };

  writeAll([question, ...readAll()]);
  return question;
}

export function updateQuestion(
  id: string,
  patch: Partial<StoredQuestion>,
): StoredQuestion | null {
  const questions = readAll();
  const index = questions.findIndex((q) => q.id === id);
  if (index === -1) return null;

  const updated = { ...questions[index], ...patch };
  questions[index] = updated;
  writeAll(questions);
  return updated;
}

export function deleteQuestion(id: string): void {
  writeAll(readAll().filter((q) => q.id !== id));
}

export function deleteQuestionsBulk(ids: string[]): number {
  if (ids.length === 0) return 0;
  const idSet = new Set(ids);
  const remaining = readAll().filter((q) => !idSet.has(q.id));
  const removed = readAll().length - remaining.length;
  writeAll(remaining);
  return removed;
}

export function getUpcomingReviewQuestions(): StoredQuestion[] {
  const todayKey = toDateKey(new Date());
  return readAll().filter((question) => {
    if (question.phase === "completed" || question.archived) return false;
    return toDateKey(new Date(question.nextReviewDate)) > todayKey;
  });
}

export function bringAllReviewsToToday(): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const iso = today.toISOString();
  let count = 0;

  const updated = readAll().map((question) => {
    if (question.phase === "completed" || question.archived) return question;
    if (toDateKey(new Date(question.nextReviewDate)) > toDateKey(new Date())) {
      count += 1;
      return { ...question, nextReviewDate: iso };
    }
    return question;
  });

  writeAll(updated);
  return count;
}

function normalizeQuestion(question: StoredQuestion): StoredQuestion {
  return {
    ...question,
    keywords: question.keywords ?? [],
    extraImageDataUrls: question.extraImageDataUrls ?? [],
    source: question.source ?? undefined,
    wrongReason: question.wrongReason ?? undefined,
    wrongReasonDetail: question.wrongReasonDetail ?? undefined,
    reflectionMemo: question.reflectionMemo ?? undefined,
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
