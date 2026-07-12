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
  answer_text: string | null;
  answer_image_url: string | null;
  keywords: string[] | null;
  source: string | null;
  wrong_reason: string | null;
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
    answerText: row.answer_text ?? undefined,
    answerImageDataUrl: row.answer_image_url ?? undefined,
    keywords: row.keywords ?? [],
    source: row.source ?? undefined,
    wrongReason: row.wrong_reason ?? undefined,
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
  answerText?: string;
  answerImageDataUrl?: string;
  keywords: string[];
  source?: string;
  wrongReason?: string;
  wrongReasonDetail?: string;
  reflectionMemo?: string;
};

export type UpdateReflectionInput = {
  questionId: string;
  source?: string;
  wrongReason?: string;
  wrongReasonDetail?: string;
  reflectionMemo?: string;
};

export async function saveQuestionOnServer(
  userId: string,
  input: SaveQuestionInput,
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      image_url: imageUrl,
      extra_image_urls: extraImageUrls,
      answer_text: input.answerText ?? null,
      answer_image_url: answerImageUrl ?? null,
      keywords: input.keywords,
      source: input.source ?? null,
      wrong_reason: input.wrongReason ?? null,
      wrong_reason_detail: input.wrongReasonDetail ?? null,
      reflection_memo: input.reflectionMemo ?? null,
      phase: "short",
      streak_count: 0,
      next_review_date: nextReviewDate.toISOString(),
    })
    .select("*")
    .single();

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

export async function updateReflectionOnServer(
  userId: string,
  input: UpdateReflectionInput,
): Promise<StoredQuestion> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .update({
      source: input.source ?? null,
      wrong_reason: input.wrongReason ?? null,
      wrong_reason_detail: input.wrongReasonDetail ?? null,
      reflection_memo: input.reflectionMemo ?? null,
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
