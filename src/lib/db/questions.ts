import { createClient } from "@/lib/supabase/client";
import { uploadDataUrl } from "@/lib/db/images";
import { getReviewSettings } from "@/lib/data/review-settings";
import type { StoredQuestion } from "@/lib/storage/questions";
import type { ReviewPhase } from "@/types/subject";

type QuestionRow = {
  id: string;
  user_id: string;
  subject_id: string;
  image_url: string;
  extra_image_urls: string[] | null;
  problem_latex: string | null;
  ocr_text: string | null;
  entry_mode: "manual" | "ai";
  created_by: string | null;
  created_by_role: "student" | "admin" | "sub_admin" | null;
  answer_text: string | null;
  answer_image_url: string | null;
  keywords: string[] | null;
  source: string | null;
  wrong_reason: string | null;
  wrong_keywords: string[] | null;
  wrong_reason_detail: string | null;
  reflection_memo: string | null;
  phase: ReviewPhase;
  streak_count: number;
  next_review_date: string;
  last_answered_at: string | null;
  archived: boolean;
  created_at: string;
};

function rowToStored(row: QuestionRow): StoredQuestion {
  return {
    id: row.id,
    subjectId: row.subject_id,
    userId: row.user_id,
    imageDataUrl: row.image_url,
    extraImageDataUrls: row.extra_image_urls ?? [],
    problemLatex: row.problem_latex ?? undefined,
    ocrText: row.ocr_text ?? undefined,
    entryMode: row.entry_mode,
    createdBy: row.created_by ?? undefined,
    createdByRole: row.created_by_role ?? undefined,
    answerText: row.answer_text ?? undefined,
    answerImageDataUrl: row.answer_image_url ?? undefined,
    keywords: row.keywords ?? [],
    source: row.source ?? undefined,
    wrongReason: row.wrong_reason ?? undefined,
    wrongKeywords:
      row.wrong_keywords && row.wrong_keywords.length > 0
        ? row.wrong_keywords
        : row.wrong_reason_detail
          ? row.wrong_reason_detail
              .split(/[,，#\s]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    wrongReasonDetail: row.wrong_reason_detail ?? undefined,
    reflectionMemo: row.reflection_memo ?? undefined,
    phase: row.phase,
    streakCount: row.streak_count,
    nextReviewDate: row.next_review_date,
    lastAnsweredAt: row.last_answered_at ?? undefined,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchAll(userId: string): Promise<StoredQuestion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as QuestionRow[]).map(rowToStored);
}

export async function getQuestionsBySubject(
  userId: string,
  subjectId: string,
): Promise<StoredQuestion[]> {
  const all = await fetchAll(userId);
  return all.filter((q) => q.subjectId === subjectId);
}

export async function getQuestionCountBySubject(
  userId: string,
  subjectId: string,
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("subject_id", subjectId);

  if (error) throw error;
  return count ?? 0;
}

export async function getTodayReviewQuestions(
  userId: string,
  subjectId?: string,
  today = new Date(),
): Promise<StoredQuestion[]> {
  const todayKey = toDateKey(today);
  const all = await fetchAll(userId);
  return all.filter((question) => {
    if (question.phase === "completed") return false;
    if (question.archived) return false;
    if (subjectId && question.subjectId !== subjectId) return false;
    return toDateKey(new Date(question.nextReviewDate)) <= todayKey;
  });
}

export async function getArchivedQuestions(
  userId: string,
): Promise<StoredQuestion[]> {
  const all = await fetchAll(userId);
  return all.filter((q) => q.archived || q.phase === "completed");
}

export async function getAllQuestions(userId: string): Promise<StoredQuestion[]> {
  return fetchAll(userId);
}

export async function getUpcomingReviewQuestions(
  userId: string,
): Promise<StoredQuestion[]> {
  const todayKey = toDateKey(new Date());
  const all = await fetchAll(userId);
  return all.filter((question) => {
    if (question.phase === "completed" || question.archived) return false;
    return toDateKey(new Date(question.nextReviewDate)) > todayKey;
  });
}

export async function saveQuestion(
  userId: string,
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
): Promise<StoredQuestion> {
  const settings = await getReviewSettings(userId, input.subjectId);
  const createdAt = new Date();
  const nextReviewDate = new Date(createdAt);
  nextReviewDate.setDate(
    nextReviewDate.getDate() + settings.shortIntervalDays,
  );

  const imageUrl = input.imageDataUrl.startsWith("data:")
    ? await uploadDataUrl(input.imageDataUrl, userId, "question")
    : input.imageDataUrl;

  let answerImageUrl: string | undefined;
  if (input.answerImageDataUrl) {
    answerImageUrl = input.answerImageDataUrl.startsWith("data:")
      ? await uploadDataUrl(input.answerImageDataUrl, userId, "answer")
      : input.answerImageDataUrl;
  }

  const { uploadDataUrlsIfNeeded } = await import("@/lib/utils/question-images");
  const extraImageUrls = input.extraImageDataUrls?.length
    ? await uploadDataUrlsIfNeeded(
        input.extraImageDataUrls,
        userId,
        "question",
        uploadDataUrl,
      )
    : [];

  const answerText = input.answerText?.trim();
  if (!answerText) {
    throw new Error("ANSWER_TEXT_REQUIRED");
  }

  const wrongReasonDetail =
    input.wrongReasonDetail ??
    (input.wrongKeywords?.length ? input.wrongKeywords.join(", ") : null);

  const supabase = createClient();
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", userId)
    .maybeSingle();
  const baseRow = {
    user_id: userId,
    academy_id: ownerProfile?.academy_id ?? null,
    subject_id: input.subjectId,
    image_url: imageUrl,
    extra_image_urls: extraImageUrls,
    problem_latex: input.problemLatex?.trim() || null,
    ocr_text: input.ocrText?.trim() || null,
    entry_mode: input.entryMode ?? (input.problemLatex ? "ai" : "manual"),
    created_by: input.createdBy ?? userId,
    created_by_role: input.createdByRole ?? "student",
    answer_text: answerText,
    answer_image_url: answerImageUrl ?? null,
    keywords: input.keywords,
    source: input.source ?? null,
    wrong_reason: input.wrongReason ?? null,
    wrong_reason_detail: wrongReasonDetail,
    reflection_memo: input.reflectionMemo ?? null,
    phase: "short" as const,
    streak_count: 0,
    next_review_date: nextReviewDate.toISOString(),
  };

  let { data, error } = await supabase
    .from("questions")
    .insert({
      ...baseRow,
      wrong_keywords: input.wrongKeywords ?? [],
    })
    .select("*")
    .single();

  if (
    error &&
    (error.code === "PGRST204" ||
      (error.message ?? "").includes("wrong_keywords") ||
      (error.message ?? "").includes("schema cache"))
  ) {
    ({ data, error } = await supabase
      .from("questions")
      .insert(baseRow)
      .select("*")
      .single());
  }

  if (error) throw error;
  return rowToStored(data as QuestionRow);
}

export async function updateQuestion(
  userId: string,
  id: string,
  patch: Partial<StoredQuestion>,
): Promise<StoredQuestion | null> {
  const supabase = createClient();
  const update: Record<string, unknown> = {};

  if (patch.phase !== undefined) update.phase = patch.phase;
  if (patch.streakCount !== undefined) update.streak_count = patch.streakCount;
  if (patch.nextReviewDate !== undefined) {
    update.next_review_date = patch.nextReviewDate;
  }
  if (patch.lastAnsweredAt !== undefined) {
    update.last_answered_at = patch.lastAnsweredAt;
  }
  if (patch.archived !== undefined) update.archived = patch.archived;
  if (patch.source !== undefined) update.source = patch.source || null;
  if (patch.keywords !== undefined) update.keywords = patch.keywords;
  if (patch.wrongReason !== undefined) update.wrong_reason = patch.wrongReason || null;
  if (patch.wrongKeywords !== undefined) {
    update.wrong_keywords = patch.wrongKeywords ?? [];
    update.wrong_reason_detail =
      patch.wrongKeywords.length > 0 ? patch.wrongKeywords.join(", ") : null;
  }
  if (patch.wrongReasonDetail !== undefined && patch.wrongKeywords === undefined) {
    update.wrong_reason_detail = patch.wrongReasonDetail || null;
  }
  if (patch.reflectionMemo !== undefined) {
    update.reflection_memo = patch.reflectionMemo || null;
  }
  if (patch.answerText !== undefined) update.answer_text = patch.answerText || null;
  if (patch.problemLatex !== undefined) {
    update.problem_latex = patch.problemLatex?.trim() || null;
  }

  const { data, error } = await supabase
    .from("questions")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToStored(data as QuestionRow);
}

export async function deleteQuestion(
  userId: string,
  id: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteQuestionsBulk(
  userId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;

  const supabase = createClient();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (error) throw error;
  return ids.length;
}

export async function bringAllReviewsToToday(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const iso = today.toISOString();
  const all = await fetchAll(userId);
  let count = 0;

  for (const question of all) {
    if (question.phase === "completed" || question.archived) continue;
    if (toDateKey(new Date(question.nextReviewDate)) > toDateKey(new Date())) {
      count += 1;
      await updateQuestion(userId, question.id, { nextReviewDate: iso });
    }
  }

  return count;
}
