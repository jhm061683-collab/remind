import {
  EXTRACT_SYSTEM_PROMPT,
  normalizeExtractJson,
  type QuestionExtractInput,
  type QuestionExtractResult,
} from "@/lib/server/ai/extract-types";
import { parseImageDataUrl } from "@/lib/server/ai/image-data";

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

export function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export async function extractWithOpenAI(
  input: QuestionExtractInput,
): Promise<QuestionExtractResult> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY 가 없습니다. Premium GPT-4o를 쓰려면 환경변수에 넣어 주세요.",
    );
  }

  const urls = input.imageDataUrls.filter(Boolean);
  if (urls.length === 0) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const imageContent = urls.map((url) => {
    const { mimeType, base64 } = parseImageDataUrl(url);
    return {
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high" as const,
      },
    };
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: '이 문제 사진을 분석해서 JSON으로 답하세요. 키: problemLatex, answer, keywords',
            },
            ...imageContent,
          ],
        },
      ],
    }),
  });

  const body = (await res.json()) as OpenAIResponse;
  if (!res.ok) {
    throw new Error(body.error?.message || "OpenAI API 호출에 실패했습니다.");
  }

  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("GPT-4o가 빈 응답을 반환했습니다. 사진을 다시 찍어 주세요.");
  }

  let parsed;
  try {
    parsed = normalizeExtractJson(text);
  } catch {
    throw new Error("GPT-4o 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }

  return {
    engine: "gpt-4o",
    provider: "openai",
    problemLatex: parsed.problemLatex,
    answerGuess: parsed.answerGuess,
    keywords: parsed.keywords,
    rawText: text,
    note: parsed.answerGuess
      ? "GPT-4o(골드 티켓)가 읽은 결과입니다. 정답·문장을 확인해 주세요."
      : "문제를 읽었지만 정답을 확신하지 못했습니다. 정답을 직접 입력해 주세요.",
  };
}
