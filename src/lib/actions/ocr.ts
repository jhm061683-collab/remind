"use server";

import { getSession } from "@/lib/auth/session";
import type { OcrExtractResult } from "@/lib/ocr/types";
import { createServiceClient } from "@/lib/supabase/service";
import {
  completeAiRequest,
  getAvailableEngineAndDeductQuota,
  refundAiQuota,
  type AiEngine,
} from "@/lib/server/ai/engine-quota";
import {
  canUseGpt4o,
  extractQuestion,
  hasAnyAiExtractKey,
} from "@/lib/server/ai/extract-question";
import { AiExtractError } from "@/lib/server/ai/extract-types";
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
  /** 클라이언트가 한 번 생성하고 재전송에도 유지하는 멱등 요청 UUID */
  requestId: string;
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

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.requestId,
    )
  ) {
    return { error: "잘못된 AI 요청입니다. 다시 시도해 주세요." };
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
    requestId: input.requestId,
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

  // 네트워크 응답 유실로 동일 요청이 재전송되면 외부 AI를 다시 호출하지 않는다.
  if (quota.cachedPayload && isCachedOcrPayload(quota.cachedPayload)) {
    return {
      ...quota.cachedPayload,
      used: quota.dailyUsed,
      limit: quota.dailyLimit,
      monthlyUsed: quota.monthlyUsed,
      monthlyLimit: quota.monthlyLimit,
      advancedUsed: quota.goldUsed,
      advancedLimit: quota.goldLimit,
      engine: quota.engine,
    };
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

    const response: OcrActionState = {
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

    // 캐시 기록 실패가 이미 성공한 AI 결과까지 버리게 하지는 않는다.
    // 쿼터는 예약 상태로 남으므로 무료 중복 호출도 발생하지 않는다.
    try {
      await completeAiRequest({
        requestId: input.requestId,
        userId: session.id,
        responsePayload: {
          result: response.result,
          mock: response.mock,
          engine: response.engine,
        },
      });
    } catch (completeError) {
      console.error("[completeAiRequest]", completeError);
    }

    return response;
  } catch (err) {
    // 과금된 실패(제공자가 사진을 처리했지만 결과가 비었거나 파싱 불가)는
    // 학생이 이상한 사진을 올린 경우처럼 우리 잘못이 아니어도 비용이 이미 나갔다.
    // 이런 요청은 환불하지 않고(무한 재시도 방지) 실제 비용을 원장 지출로 기록한다.
    const billed = err instanceof AiExtractError && err.billed;

    if (billed) {
      const failedError = err as AiExtractError;
      await logAiCost({
        userId: session.id,
        academyId: (profile?.academy_id as string | null) ?? null,
        engine: failedError.engine,
        kind: "extract",
        usage: failedError.usage,
        subjectId: input.subjectId?.trim() || null,
        imageCount: allImages.length,
        problemCount: 0,
      });
      // 예약을 완료 처리해 재전송이 무료 재호출로 이어지지 않도록 못 박는다.
      try {
        await completeAiRequest({
          requestId: input.requestId,
          userId: session.id,
          responsePayload: { failed: true, engine: failedError.engine },
        });
      } catch (completeError) {
        console.error("[completeAiRequest:billed-fail]", completeError);
      }
    } else {
      // 과금 전 실패(키 없음, 이미지 오류, 제공자 거부)만 쿼터를 환불한다.
      await refundAiQuota({
        requestId: input.requestId,
        userId: session.id,
        reason: err instanceof Error ? err.message : "ai_failed",
      });
    }

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

function isCachedOcrPayload(value: unknown): value is Pick<
  OcrActionState,
  "result" | "mock" | "engine"
> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(record.result && typeof record.result === "object");
}
