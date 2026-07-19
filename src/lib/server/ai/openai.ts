import {
  AiExtractError,
  EXTRACT_SYSTEM_PROMPT,
  normalizeExtractJson,
  type AiTokenUsage,
  type QuestionExtractInput,
  type QuestionExtractResult,
} from "@/lib/server/ai/extract-types";
import { composeProblemLatex } from "@/lib/utils/problem-latex";
import { resolveImageParts } from "@/lib/server/ai/image-data";

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
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
    throw new Error("정밀 AI 연결 설정이 아직 완료되지 않았습니다.");
  }

  const urls = input.imageDataUrls.filter(Boolean);
  if (urls.length === 0) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const imageContent = await Promise.all(
    urls.map(async (url) => {
      const { mimeType, base64 } = await resolveImageParts(url);
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: "high" as const,
        },
      };
    }),
  );

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
              text: "이 문제 사진을 분석해서 JSON으로 답하세요. 키: sharedPassage, problems[{number, problemLatex, answer, keywords, figures[{pageIndex,x,y,width,height}]}]. 여러 문항이면 problems로 최대 5개 분리. 그래프·도형·표는 설명으로 바꾸지 말고 원본 영역 좌표와 [[FIGURE_1]] 위치 표시를 반환하세요.",
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

  // 제공자가 이미지를 처리했으므로 입력 토큰은 청구됨. 이후 실패는 과금된 실패.
  const billedUsage: AiTokenUsage = {
    promptTokens: Number(body.usage?.prompt_tokens ?? 0),
    outputTokens: Number(body.usage?.completion_tokens ?? 0),
    thoughtsTokens: 0,
  };

  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new AiExtractError(
      "AI가 문제를 읽지 못했습니다. 사진을 더 밝고 또렷하게 다시 찍어 주세요.",
      { billed: true, engine: "gpt-4o", usage: billedUsage },
    );
  }

  let parsed;
  try {
    parsed = normalizeExtractJson(text);
  } catch {
    throw new AiExtractError(
      "AI가 정리한 내용을 읽지 못했습니다. 사진을 다시 확인해 주세요.",
      { billed: true, engine: "gpt-4o", usage: billedUsage },
    );
  }

  const first = parsed.problems[0]!;
  const count = parsed.problems.length;
  const note =
    count > 1
      ? `사진에서 ${count}개 문항을 나눴어요. 등록할 문항을 확인하고 수정해 주세요.`
      : first.answerGuess
        ? "정밀 AI가 읽은 결과입니다. 정답과 문장을 확인해 주세요."
        : "문제를 읽었지만 정답을 확신하지 못했습니다. 정답을 직접 입력해 주세요.";

  return {
    engine: "gpt-4o",
    provider: "openai",
    sharedPassage: parsed.sharedPassage,
    problems: parsed.problems,
    problemLatex: composeProblemLatex(parsed.sharedPassage, first.problemLatex),
    answerGuess: first.answerGuess,
    keywords: first.keywords,
    rawText: text,
    usage: {
      promptTokens: Number(body.usage?.prompt_tokens ?? 0),
      outputTokens: Number(body.usage?.completion_tokens ?? 0),
      thoughtsTokens: 0,
    },
    note,
  };
}
