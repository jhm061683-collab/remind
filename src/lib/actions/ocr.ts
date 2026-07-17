"use server";

import { getSession } from "@/lib/auth/session";
import { ocrExtract, isOcrMockMode } from "@/lib/ocr/extract";
import type { OcrExtractResult } from "@/lib/ocr/types";
import { createServiceClient } from "@/lib/supabase/service";
import { consumeOcrQuota } from "@/lib/server/billing/queries";

export type OcrActionState = {
  error?: string;
  result?: OcrExtractResult;
  mock?: boolean;
  used?: number;
  limit?: number;
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

  const quota = await consumeOcrQuota({
    userId: session.id,
    academyId: (profile?.academy_id as string | null) ?? null,
  });
  if (quota.error) {
    return {
      error: quota.error,
      used: quota.used,
      limit: quota.limit,
    };
  }

  try {
    const result = await ocrExtract({ imageDataUrl });
    return {
      result,
      mock: isOcrMockMode(),
      used: quota.used,
      limit: quota.limit,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "OCR에 실패했습니다.",
    };
  }
}
