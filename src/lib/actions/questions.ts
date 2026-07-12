"use server";

import { getSession } from "@/lib/auth/session";
import {
  saveQuestionOnServer,
  type SaveQuestionInput,
} from "@/lib/server/save-question";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";

export type SaveQuestionState = {
  error?: string;
};

export type DeleteQuestionState = {
  error?: string;
};

export type DeleteQuestionsBulkState = {
  error?: string;
  deletedCount?: number;
};

export type UpdateReflectionState = {
  error?: string;
  question?: import("@/lib/storage/questions").StoredQuestion;
};

function toErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "등록 실패. 사진을 다시 선택해 주세요.";
  }

  const record = err as {
    message?: string;
    statusCode?: string;
    error?: string;
    code?: string;
  };
  const message = record.message ?? record.error ?? "";

  if (message.includes("ANSWER_TEXT_REQUIRED")) {
    return "정답을 입력해 주세요. (해설 사진은 선택이에요)";
  }
  if (message.includes("Bucket not found") || message.includes("question-images")) {
    return "Storage 버킷이 없습니다. Supabase SQL을 다시 실행해 주세요.";
  }
  if (message.includes("row-level security") || message.includes("JWT")) {
    return "로그인이 만료되었습니다. 로그아웃 후 다시 로그인해 주세요.";
  }
  if (message.includes("INVALID_IMAGE_DATA") || message.includes("NO_IMAGE")) {
    return "사진을 불러오지 못했습니다. 다시 선택해 주세요.";
  }
  if (
    record.code === "PGRST204" ||
    message.includes("wrong_keywords") ||
    message.includes("schema cache")
  ) {
    return "DB 설정이 오래됐어요. Supabase에서 wrong_keywords SQL을 실행한 뒤 다시 시도해 주세요.";
  }

  return "등록 실패. 사진을 다시 선택해 주세요.";
}

export async function saveQuestionAction(
  input: SaveQuestionInput,
): Promise<SaveQuestionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  }

  try {
    await saveQuestionOnServer(session.id, input);
    return {};
  } catch (err) {
    console.error("[saveQuestionAction]", err);
    return { error: toErrorMessage(err) };
  }
}

export async function deleteQuestionAction(
  questionId: string,
): Promise<DeleteQuestionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  }

  try {
    const { deleteQuestionOnServer } = await import(
      "@/lib/server/delete-question"
    );
    await deleteQuestionOnServer(session.id, questionId);
    return {};
  } catch (err) {
    console.error("[deleteQuestionAction]", err);
    return { error: "삭제에 실패했습니다. 다시 시도해 주세요." };
  }
}

export async function deleteQuestionsBulkAction(
  questionIds: string[],
): Promise<DeleteQuestionsBulkState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  }

  if (questionIds.length === 0) {
    return { error: "삭제할 문제가 없습니다." };
  }

  try {
    const { deleteQuestionsBulkOnServer } = await import(
      "@/lib/server/delete-question"
    );
    const deletedCount = await deleteQuestionsBulkOnServer(
      session.id,
      questionIds,
    );
    return { deletedCount };
  } catch (err) {
    console.error("[deleteQuestionsBulkAction]", err);
    return { error: "일괄 삭제에 실패했습니다. 다시 시도해 주세요." };
  }
}

export async function updateReflectionAction(input: {
  questionId: string;
  source?: string;
  keywords?: string[];
  wrongReason?: string;
  wrongKeywords?: string[];
  wrongReasonDetail?: string;
  reflectionMemo?: string;
}): Promise<UpdateReflectionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
  }

  try {
    const { updateReflectionOnServer } = await import(
      "@/lib/server/save-question"
    );
    const question = await updateReflectionOnServer(session.id, input);
    return { question };
  } catch (err) {
    console.error("[updateReflectionAction]", err);
    return { error: "저장에 실패했습니다. 다시 시도해 주세요." };
  }
}
