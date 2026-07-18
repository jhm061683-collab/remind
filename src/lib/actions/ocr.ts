"use server";

import { getSession } from "@/lib/auth/session";
import type { OcrExtractResult } from "@/lib/ocr/types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getAvailableEngineAndDeductQuota,
  type AiEngine,
} from "@/lib/server/ai/engine-quota";
import {
  canUseGpt4o,
  extractQuestion,
  hasAnyAiExtractKey,
} from "@/lib/server/ai/extract-question";

export type OcrActionState = {
  error?: string;
  result?: OcrExtractResult;
  mock?: boolean;
  /** 오늘 사용 건수 / 일일 한도 */
  used?: number;
  limit?: number;
  /** 이번 달 사용 건수 / 월 한도 */
  monthlyUsed?: number;
  monthlyLimit?: number;
  /** 이번 요청에 배정된 엔진 */
  engine?: AiEngine;
};

export async function ocrFromImageAction(input: {
  imageDataUrl: string;
  /** 여러 장일 때 추가 페이지 (선택) */
  extraImageDataUrls?: string[];
}): Promise<OcrActionState> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { error: "학생 로그인 후 사용할 수 있습니다." };
  }

  const imageDataUrl = input.imageDataUrl?.trim() ?? "";
  if (!imageDataUrl) {
    return { error: "문제 사진을 먼저 선택해 주세요." };
  }

  const extra = (input.extraImageDataUrls ?? [])
    .map((u) => u?.trim())
    .filter((u): u is string => Boolean(u));
  const allImages = [imageDataUrl, ...extra];

  for (const url of allImages) {
    if (url.length > 5_500_000) {
      return { error: "사진이 너무 큽니다. 조금 줄여서 다시 시도해 주세요." };
    }
  }

  if (!hasAnyAiExtractKey()) {
    return {
      error:
        "AI 키가 아직 없습니다. 관리자에게 GEMINI_API_KEY(또는 OPENAI_API_KEY) 설정을 요청해 주세요.",
    };
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .maybeSingle();

  // B타입(업로드 즉시 추출) 1건 차감 + 엔진 결정
  // OpenAI 키가 없으면 골드 티켓을 쓰지 않음
  const quota = await getAvailableEngineAndDeductQuota({
    userId: session.id,
    academyId: (profile?.academy_id as string | null) ?? null,
    kind: "extract",
    allowGold: canUseGpt4o(),
  });
  if (quota.error) {
    return {
      error: quota.error,
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
    };
  }

  if (!quota.engine) {
    return { error: "사용할 AI 엔진을 정하지 못했습니다." };
  }

  try {
    const extracted = await extractQuestion({
      imageDataUrls: allImages,
      engine: quota.engine,
    });

    const result: OcrExtractResult = {
      provider: extracted.provider,
      rawText: extracted.rawText,
      problemLatex: extracted.problemLatex,
      answerGuess: extracted.answerGuess,
      keywords: extracted.keywords,
      note: extracted.note,
    };

    return {
      result,
      mock: false,
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      engine: extracted.engine,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "AI 분석에 실패했습니다.",
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      engine: quota.engine,
    };
  }
}
