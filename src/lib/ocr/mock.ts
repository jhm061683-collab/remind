import { parseOcrText } from "@/lib/ocr/parse";
import type { OcrExtractInput, OcrExtractResult } from "@/lib/ocr/types";

export async function extractWithMock(
  _input: OcrExtractInput,
): Promise<OcrExtractResult> {
  // 키 없이도 UI·폼 채우기 흐름을 시험할 수 있게 함
  const rawText = [
    "(목 OCR) 실제 글자 인식은 Google Vision 키가 있을 때 동작합니다.",
    "정답: ",
  ].join("\n");

  const parsed = parseOcrText(rawText);
  return {
    provider: "mock",
    rawText,
    answerGuess: parsed.answerGuess,
    keywords: parsed.keywords,
    note: "목 모드입니다. GOOGLE_VISION_API_KEY 를 넣으면 사진을 실제로 읽습니다.",
  };
}
