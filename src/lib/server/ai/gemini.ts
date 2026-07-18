import {
  EXTRACT_RESPONSE_SCHEMA,
  EXTRACT_SYSTEM_PROMPT,
  normalizeExtractJson,
  type QuestionExtractInput,
  type QuestionExtractResult,
} from "@/lib/server/ai/extract-types";
import { parseImageDataUrl } from "@/lib/server/ai/image-data";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

const GEMINI_MODEL = "gemini-2.0-flash";

export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    null
  );
}

export async function extractWithGemini(
  input: QuestionExtractInput,
): Promise<QuestionExtractResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 가 없습니다. Vercel/로컬 환경변수에 넣어 주세요.",
    );
  }

  const urls = input.imageDataUrls.filter(Boolean);
  if (urls.length === 0) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const imageParts = urls.map((url) => {
    const { mimeType, base64 } = parseImageDataUrl(url);
    return {
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: EXTRACT_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "이 문제 사진을 분석해서 JSON으로 답하세요.",
              },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
          response_schema: {
            ...EXTRACT_RESPONSE_SCHEMA,
            propertyOrdering: ["problemLatex", "answer", "keywords"],
          },
        },
      }),
    },
  );

  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(body.error?.message || "Gemini API 호출에 실패했습니다.");
  }

  const text =
    body.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다. 사진을 다시 찍어 주세요.");
  }

  let parsed;
  try {
    parsed = normalizeExtractJson(text);
  } catch {
    throw new Error("Gemini 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }

  return {
    engine: "gemini-2.0-flash",
    provider: "gemini",
    problemLatex: parsed.problemLatex,
    answerGuess: parsed.answerGuess,
    keywords: parsed.keywords,
    rawText: text,
    note: parsed.answerGuess
      ? "Gemini가 읽은 결과입니다. 정답·문장을 확인해 주세요."
      : "문제를 읽었지만 정답을 확신하지 못했습니다. 정답을 직접 입력해 주세요.",
  };
}
