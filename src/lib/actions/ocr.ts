"use server";

import { getSession } from "@/lib/auth/session";
import { ocrExtract, isOcrMockMode } from "@/lib/ocr/extract";
import type { OcrExtractResult } from "@/lib/ocr/types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getAvailableEngineAndDeductQuota,
  type AiEngine,
} from "@/lib/server/ai/engine-quota";

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
}): Promise<OcrActionState> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { error: "학생 로그인 후 사용할 수 있습니다." };
  }

  const imageDataUrl = input.imageDataUrl?.trim() ?? "";
  if (!imageDataUrl) {
    return { error: "문제 사진을 먼저 선택해 주세요." };
  }

  if (imageDataUrl.length > 5_500_000) {
    return { error: "사진이 너무 큽니다. 조금 줄여서 다시 시도해 주세요." };
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", session.id)
    .maybeSingle();

  // B타입(업로드 즉시 추출) 1건 차감 + 엔진 결정
  const quota = await getAvailableEngineAndDeductQuota({
    userId: session.id,
    academyId: (profile?.academy_id as string | null) ?? null,
    kind: "extract",
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

  try {
    const result = await ocrExtract({ imageDataUrl });
    return {
      result,
      mock: isOcrMockMode(),
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      engine: quota.engine,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "OCR에 실패했습니다.",
    };
  }
}
