import { parseOcrText, stripDataUrlBase64 } from "@/lib/ocr/parse";
import type { OcrExtractInput, OcrExtractResult } from "@/lib/ocr/types";

type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
  error?: { message?: string };
};

export function getVisionApiKey(): string | null {
  return (
    process.env.GOOGLE_VISION_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim() ||
    null
  );
}

export async function extractWithVision(
  input: OcrExtractInput,
): Promise<OcrExtractResult> {
  const apiKey = getVisionApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY 가 없습니다.");
  }

  const content = stripDataUrlBase64(input.imageDataUrl);
  if (!content || content.length < 32) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    },
  );

  const body = (await res.json()) as VisionResponse;
  if (!res.ok) {
    throw new Error(body.error?.message || "Vision API 호출에 실패했습니다.");
  }

  const first = body.responses?.[0];
  if (first?.error?.message) {
    throw new Error(first.error.message);
  }

  const rawText =
    first?.fullTextAnnotation?.text?.trim() ||
    first?.textAnnotations?.[0]?.description?.trim() ||
    "";

  const parsed = parseOcrText(rawText);
  return {
    provider: "vision",
    rawText,
    answerGuess: parsed.answerGuess,
    keywords: parsed.keywords,
    note: rawText
      ? "인식 결과를 확인해 주세요. 틀리면 직접 고치면 됩니다."
      : "글자를 찾지 못했습니다. 정답을 직접 입력해 주세요.",
  };
}
