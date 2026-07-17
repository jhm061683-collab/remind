import { extractWithMock } from "@/lib/ocr/mock";
import type { OcrExtractInput, OcrExtractResult, OcrProviderName } from "@/lib/ocr/types";
import { extractWithVision, getVisionApiKey } from "@/lib/ocr/vision";

export function resolveOcrProvider(): OcrProviderName {
  const forced = process.env.OCR_PROVIDER?.trim().toLowerCase();
  if (forced === "mock" || forced === "vision") return forced;
  return getVisionApiKey() ? "vision" : "mock";
}

export function isOcrMockMode(): boolean {
  return resolveOcrProvider() === "mock";
}

/** 앱은 이 함수만 호출. Vision ↔ GPT 교체는 provider만 바꾸면 됨 */
export async function ocrExtract(
  input: OcrExtractInput,
): Promise<OcrExtractResult> {
  const provider = resolveOcrProvider();
  if (provider === "vision") {
    return extractWithVision(input);
  }
  return extractWithMock(input);
}
