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
import { logAiCost } from "@/lib/server/ai/cost";

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
  /** 이번 달 정밀 AI 사용량 / 한도 */
  advancedUsed?: number;
  advancedLimit?: number;
  /** 이번 요청에 배정된 엔진 */
  engine?: AiEngine;
};

export async function ocrFromImageAction(input: {
  imageDataUrl: string;
  /** 여러 장일 때 추가 페이지 (선택) */
  extraImageDataUrls?: string[];
  /** 업로드 화면에서 선택한 과목 (비용 분석용) */
  subjectId?: string;
  /** 학생이 이번 요청에서 선택한 AI 정리 방식 */
  aiMode?: "standard" | "advanced";
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
      error: "AI 연결 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
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
    preferGold: input.aiMode === "advanced",
  });
  if (quota.error) {
    return {
      error: quota.error,
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      advancedUsed: quota.goldUsed,
      advancedLimit: quota.goldLimit,
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

    await logAiCost({
      userId: session.id,
      academyId: (profile?.academy_id as string | null) ?? null,
      engine: extracted.engine,
      kind: "extract",
      usage: extracted.usage,
      subjectId: input.subjectId?.trim() || null,
      imageCount: allImages.length,
      problemCount: Math.max(1, extracted.problems?.length ?? 1),
    });

    const result: OcrExtractResult = {
      provider: extracted.provider,
      rawText: extracted.rawText,
      sharedPassage: extracted.sharedPassage,
      problems: extracted.problems,
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
      advancedUsed: quota.goldUsed,
      advancedLimit: quota.goldLimit,
      engine: extracted.engine,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "AI 분석에 실패했습니다.",
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      advancedUsed: quota.goldUsed,
      advancedLimit: quota.goldLimit,
      engine: quota.engine,
    };
  }
}
