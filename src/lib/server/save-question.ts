import { uploadDataUrlOnServer } from "@/lib/server/upload-image";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_REVIEW_SETTINGS,
  GLOBAL_SETTINGS_KEY,
  sanitizeSettings,
} from "@/lib/storage/review-settings";
import type { StoredQuestion } from "@/lib/storage/questions";
import type { ReviewPhase, ReviewSettings } from "@/types/subject";

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

export type SaveQuestionInput = {
  subjectId: string;
  imageDataUrl: string;
  extraImageDataUrls?: string[];
  problemLatex?: string;
  ocrText?: string;
  entryMode?: "manual" | "ai";
  answerText?: string;
  answerImageDataUrl?: string;
  keywords: string[];
  source?: string;
  wrongReason?: string;
  wrongKeywords?: string[];
  wrongReasonDetail?: string;
  reflectionMemo?: string;
};

export type UpdateReflectionInput = {
  questionId: string;
  source?: string;
  keywords?: string[];
  wrongReason?: string;
  wrongKeywords?: string[];
  wrongReasonDetail?: string;
  reflectionMemo?: string;
};

export async function saveQuestionOnServer(
  userId: string,
  input: SaveQuestionInput,
  actor?: {
    id: string;
    role: "student" | "admin" | "sub_admin";
  },
): Promise<StoredQuestion> {
  const settings = await getReviewSettingsOnServer(userId, input.subjectId);
  const createdAt = new Date();
  const nextReviewDate = new Date(createdAt);
  nextReviewDate.setDate(
    nextReviewDate.getDate() + settings.shortIntervalDays,
  );

  const imageUrl = input.imageDataUrl.startsWith("data:")
    ? await uploadDataUrlOnServer(input.imageDataUrl, userId, "question")
    : input.imageDataUrl;

  let answerImageUrl: string | undefined;
  if (input.answerImageDataUrl) {
    answerImageUrl = input.answerImageDataUrl.startsWith("data:")
      ? await uploadDataUrlOnServer(input.answerImageDataUrl, userId, "answer")
      : input.answerImageDataUrl;
  }

  const { uploadDataUrlsIfNeeded } = await import("@/lib/utils/question-images");
  const extraImageUrls = input.extraImageDataUrls?.length
    ? await Promise.all(
        input.extraImageDataUrls.map(async (url) =>
          url.startsWith("data:")
            ? uploadDataUrlOnServer(url, userId, "question")
            : url,
        ),
      )
    : [];

  const answerText = input.answerText?.trim();
  if (!answerText) {
    throw new Error("ANSWER_TEXT_REQUIRED");
  }

  const wrongReasonDetail =
    input.wrongReasonDetail ??
    (input.wrongKeywords?.length ? input.wrongKeywords.join(", ") : null);

  const supabase = await createClient();
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
    created_by: actor?.id ?? userId,
    created_by_role: actor?.role ?? "student",
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

  // 011 마이그레이션 전 DB에서도 등록되게 재시도
  if (error && isMissingWrongKeywordsColumn(error)) {
    ({ data, error } = await supabase
      .from("questions")
      .insert(baseRow)
      .select("*")
      .single());
  }

  if (error) throw error;
  const question = rowToStored(data as QuestionRow);

  const { recordActivityOnServer } = await import("@/lib/server/activity");
  await recordActivityOnServer(userId, {
    type: "registered",
    questionId: question.id,
    wrongReason: input.wrongReason,
  });

  return question;
}

function isMissingWrongKeywordsColumn(error: {
  message?: string;
  code?: string;
}): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    message.includes("wrong_keywords") ||
    message.includes("schema cache")
  );
}

export async function updateReflectionOnServer(
  userId: string,
  input: UpdateReflectionInput,
): Promise<StoredQuestion> {
  const supabase = await createClient();
  const wrongReasonDetail =
    input.wrongReasonDetail ??
    (input.wrongKeywords?.length ? input.wrongKeywords.join(", ") : null);

  const baseUpdate = {
    source: input.source ?? null,
    keywords: input.keywords ?? [],
    wrong_reason: input.wrongReason ?? null,
    wrong_reason_detail: wrongReasonDetail,
    reflection_memo: input.reflectionMemo ?? null,
  };

  let { data, error } = await supabase
    .from("questions")
    .update({
      ...baseUpdate,
      wrong_keywords: input.wrongKeywords ?? [],
    })
    .eq("id", input.questionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error && isMissingWrongKeywordsColumn(error)) {
    ({ data, error } = await supabase
      .from("questions")
      .update(baseUpdate)
      .eq("id", input.questionId)
      .eq("user_id", userId)
      .select("*")
      .single());
  }

  if (error) throw error;
  return rowToStored(data as QuestionRow);
}

export async function updateProblemLatexOnServer(
  userId: string,
  input: { questionId: string; problemLatex: string },
): Promise<StoredQuestion> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .update({
      problem_latex: input.problemLatex.trim() || null,
    })
    .eq("id", input.questionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return rowToStored(data as QuestionRow);
}

async function getReviewSettingsOnServer(
  userId: string,
  subjectId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("subject_id, settings")
    .eq("user_id", userId);

  if (error) throw error;

  const rows = data ?? [];
  const subject = rows.find((r) => r.subject_id === subjectId);
  if (subject?.settings) {
    return sanitizeSettings(subject.settings as ReviewSettings);
  }

  const global = rows.find((r) => r.subject_id === GLOBAL_SETTINGS_KEY);
  if (global?.settings) {
    return sanitizeSettings(global.settings as ReviewSettings);
  }

  return DEFAULT_REVIEW_SETTINGS;
}
