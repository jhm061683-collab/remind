import type { AiEngine } from "@/lib/server/ai/engine-quota";

export type QuestionExtractResult = {
  engine: AiEngine;
  provider: "gemini" | "openai";
  /** 문제 본문 (수식은 LaTeX, 일반 텍스트 포함) */
  problemLatex: string;
  /** 정답 (객관식 기호, 숫자, 짧은 식 등) */
  answerGuess: string;
  keywords: string[];
  note?: string;
  rawText: string;
};

export type QuestionExtractInput = {
  imageDataUrls: string[];
  engine: AiEngine;
};

export const EXTRACT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    problemLatex: {
      type: "string",
      description:
        "문제 본문. 수식은 LaTeX($...$ 또는 $$...$$). 선지·조건 포함. 해설은 넣지 말 것.",
    },
    answer: {
      type: "string",
      description:
        "최종 정답만. 예: ③, 2, x=3, (2, -1). 풀이 과정은 넣지 말 것.",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "단원·개념 키워드 1~5개. 예: 이차함수, 삼각함수",
    },
  },
  required: ["problemLatex", "answer", "keywords"],
} as const;

export const EXTRACT_SYSTEM_PROMPT = `당신은 한국 중·고등 학원용 오답노트 AI입니다.
주어진 문제 사진(들)을 보고 JSON만 반환하세요.

규칙:
1. problemLatex: 문제 문장·조건을 정확히 옮기세요. 수식은 LaTeX로 씁니다.
2. answer: 정답만. 풀이·해설은 절대 쓰지 마세요. (B타입 추출)
3. keywords: 관련 단원/개념 한국어 키워드 최대 5개.
4. 확실하지 않으면 answer를 빈 문자열로 두고, problemLatex는 읽을 수 있는 만큼만 적으세요.
5. 객관식이면 ①②③④⑤ 또는 1~5 중 하나로.
6. JSON 외 다른 텍스트는 출력하지 마세요.`;

export function normalizeExtractJson(raw: unknown): {
  problemLatex: string;
  answerGuess: string;
  keywords: string[];
} {
  const obj =
    typeof raw === "string"
      ? (JSON.parse(stripCodeFence(raw)) as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  const problemLatex = String(obj.problemLatex ?? obj.problem_latex ?? "").trim();
  const answerGuess = String(obj.answer ?? obj.answerGuess ?? "").trim().slice(0, 120);
  const keywordsRaw = obj.keywords;
  const keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw
        .map((k) => String(k).trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return { problemLatex, answerGuess, keywords };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}
