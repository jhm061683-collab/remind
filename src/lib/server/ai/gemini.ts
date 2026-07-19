import {
  EXTRACT_RESPONSE_SCHEMA,
  EXTRACT_SYSTEM_PROMPT,
  normalizeExtractJson,
  type QuestionExtractInput,
  type QuestionExtractResult,
} from "@/lib/server/ai/extract-types";
import { composeProblemLatex } from "@/lib/utils/problem-latex";
import { resolveImageParts } from "@/lib/server/ai/image-data";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
};

// 신규 계정은 2.5 Flash가 막혀 있어서 기본은 3.5 Flash.
// 필요하면 GEMINI_MODEL 환경변수로 교체 가능.
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

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

  const imageParts = await Promise.all(
    urls.map(async (url) => {
      const { mimeType, base64 } = await resolveImageParts(url);
      return {
        inline_data: {
          mime_type: mimeType,
          data: base64,
        },
      };
    }),
  );

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
                text: "이 문제 사진을 분석해서 JSON으로 답하세요. 여러 문항이면 problems 배열로 분리하세요.",
              },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          // 옮겨 적기 작업이라 깊은 사고가 필요 없음.
          // 생각(thinking) 토큰은 출력 요금으로 청구되어 건당 비용을 수십 배 올린다.
          thinkingConfig: { thinkingBudget: 0 },
          // 국어 지문처럼 긴 문제는 수천 토큰이 필요하므로 넉넉히 둔다.
          maxOutputTokens: 8192,
          response_mime_type: "application/json",
          response_schema: {
            ...EXTRACT_RESPONSE_SCHEMA,
            propertyOrdering: ["sharedPassage", "problems"],
          },
        },
      }),
    },
  );

  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(body.error?.message || "Gemini API 호출에 실패했습니다.");
  }

  if (body.usageMetadata) {
    // Vercel 로그에서 건당 토큰(=비용) 추적용
    console.log(
      `[gemini] tokens in=${body.usageMetadata.promptTokenCount ?? 0} out=${body.usageMetadata.candidatesTokenCount ?? 0} thoughts=${body.usageMetadata.thoughtsTokenCount ?? 0}`,
    );
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

  const first = parsed.problems[0]!;
  const count = parsed.problems.length;
  const note =
    count > 1
      ? `사진에서 ${count}개 문항을 나눴어요. 등록할 문항을 확인하고 수정해 주세요.`
      : first.answerGuess
        ? "Gemini가 읽은 결과입니다. 정답·문장을 확인해 주세요."
        : "문제를 읽었지만 정답을 확신하지 못했습니다. 정답을 직접 입력해 주세요.";

  return {
    engine: "gemini-3.5-flash",
    provider: "gemini",
    sharedPassage: parsed.sharedPassage,
    problems: parsed.problems,
    problemLatex: composeProblemLatex(parsed.sharedPassage, first.problemLatex),
    answerGuess: first.answerGuess,
    keywords: first.keywords,
    rawText: text,
    usage: {
      promptTokens: Number(body.usageMetadata?.promptTokenCount ?? 0),
      outputTokens: Number(body.usageMetadata?.candidatesTokenCount ?? 0),
      thoughtsTokens: Number(body.usageMetadata?.thoughtsTokenCount ?? 0),
    },
    note,
  };
}
