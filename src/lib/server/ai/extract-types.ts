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
  usage?: {
    promptTokens: number;
    outputTokens: number;
    thoughtsTokens: number;
  };
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
        "원본 시험지처럼 다시 조판할 문제 본문. 한국어 문장은 일반 텍스트, 수식만 $...$ 또는 $$...$$ LaTeX. 문제 번호·조건·보기를 원본 순서와 줄바꿈대로 포함.",
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
1. problemLatex는 원본 시험지와 최대한 같은 읽기 순서와 배치로 다시 구성하세요.
2. 문제 번호, 지문, 조건, 표기, 객관식 보기 ①~⑤를 빠짐없이 포함하세요.
3. 한국어 문장은 일반 텍스트로 쓰고, 수학 수식만 $...$ 또는 $$...$$ 안에 LaTeX로 쓰세요. 한국어 전체를 \\text{}로 감싸지 마세요.
4. 각 문단과 각 보기는 줄바꿈으로 구분하세요. 긴 식이나 독립된 식은 $$...$$로 한 줄에 배치하세요.
5. problemLatex 안에는 정답 표시, 풀이, 해설, 분석을 절대 넣지 마세요.
6. answer에는 최종 정답만 쓰세요. 객관식이면 ①②③④⑤ 중 하나로 쓰세요. 정답이 여러 문항이면 "37번: ③ / 38번: ②"처럼 적으세요.
7. keywords는 관련 단원/개념 한국어 키워드 최대 5개입니다.
8. 확실하지 않으면 answer를 빈 문자열로 두고, problemLatex는 읽을 수 있는 만큼만 적으세요.
9. JSON 외 다른 텍스트는 출력하지 마세요.

긴 지문·여러 장 사진:
- 국어 독서/문학 지문처럼 길어도 지문 전문을 생략하지 말고 전부 옮기세요.
- 사진이 여러 장이면 1장→2장 순서대로 이어 붙여 하나의 problemLatex로 만드세요.
- 지문 + 문항이 같이 있으면 지문 다음에 문항을 이어서 적으세요.
- 글자가 많더라도 요약하지 마세요.`;

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
  const answerGuess = String(obj.answer ?? obj.answerGuess ?? "").trim().slice(0, 400);
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
