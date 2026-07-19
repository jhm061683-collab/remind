import type { AiEngine } from "@/lib/server/ai/engine-quota";

export type ExtractedFigureRegion = {
  /** 0부터 시작하는 사진 순서 */
  pageIndex: number;
  /** 사진 전체를 0~1000으로 본 영역 좌표 */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExtractedProblemItem = {
  /** 문항 번호 표시용. 예: "28", "37번" */
  number: string;
  /** 문항 본문 (공통 지문은 제외하고 문항만, 또는 단독 문제 전문) */
  problemLatex: string;
  answerGuess: string;
  keywords: string[];
  /** 그래프·도형·표처럼 원본 그림을 그대로 보여줄 영역 */
  figures: ExtractedFigureRegion[];
};

export type QuestionExtractResult = {
  engine: AiEngine;
  provider: "gemini" | "openai";
  /** 국어처럼 여러 문항이 공유하는 지문 (없으면 빈 문자열) */
  sharedPassage: string;
  /** 분리된 문항 (1~5개) */
  problems: ExtractedProblemItem[];
  /** 하위 호환: 첫 문항 본문 */
  problemLatex: string;
  /** 하위 호환: 첫 문항 정답 */
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

const PROBLEM_ITEM_SCHEMA = {
  type: "object",
  properties: {
    number: {
      type: "string",
      description: '문항 번호. 예: "28", "37". 없으면 빈 문자열.',
    },
    problemLatex: {
      type: "string",
      description:
        "해당 문항 본문. 한국어 문장은 일반 텍스트, 수식만 $...$ 또는 $$...$$. 공통 지문은 여기 넣지 말고 sharedPassage에 넣기.",
    },
    answer: {
      type: "string",
      description: "이 문항의 최종 정답만. 예: ③, 2, x=3",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "단원·개념 키워드 1~5개",
    },
    figures: {
      type: "array",
      description:
        "그래프·도형·지도·회로·표 등 원본 그림 영역. 없으면 빈 배열. 좌표는 각 사진 전체를 0~1000으로 환산.",
      items: {
        type: "object",
        properties: {
          pageIndex: {
            type: "integer",
            description: "그림이 있는 사진 순서. 첫 사진은 0.",
          },
          x: { type: "number", description: "왼쪽 좌표 0~1000" },
          y: { type: "number", description: "위쪽 좌표 0~1000" },
          width: { type: "number", description: "너비 1~1000" },
          height: { type: "number", description: "높이 1~1000" },
        },
        required: ["pageIndex", "x", "y", "width", "height"],
      },
    },
  },
  required: ["number", "problemLatex", "answer", "keywords", "figures"],
} as const;

export const EXTRACT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sharedPassage: {
      type: "string",
      description:
        "여러 문항이 공유하는 공통 지문(국어 독서 등). 없으면 빈 문자열. 문항별로 반복하지 말 것.",
    },
    problems: {
      type: "array",
      description: "사진에 있는 문항을 최대 5개까지 분리한 배열. 문항이 하나면 길이 1.",
      items: PROBLEM_ITEM_SCHEMA,
    },
  },
  required: ["sharedPassage", "problems"],
} as const;

export const EXTRACT_SYSTEM_PROMPT = `당신은 한국 중·고등 학원용 오답노트 AI입니다.
주어진 문제 사진(들)을 보고 JSON만 반환하세요.

핵심 — 여러 문항 분리:
1. 사진에 문항 번호가 여러 개(예: 28, 29, 30) 보이면 problems 배열로 최대 5개까지 분리하세요.
2. 문항이 하나면 problems 길이는 1입니다.
3. 국어처럼 공통 지문 + 여러 문항이면 sharedPassage에 지문 전문을 넣고, 각 problems[].problemLatex에는 해당 문항(번호·발문·보기)만 넣으세요.
4. 수학처럼 공통 지문이 없으면 sharedPassage는 빈 문자열로 두세요.
5. 5개를 넘는 문항은 앞에서부터 5개만 분리하세요.

문항 작성 규칙:
1. problemLatex는 원본 시험지와 최대한 같은 읽기 순서·배치로 다시 구성하세요.
2. 문제 번호, 조건, 객관식 보기 ①~⑤를 빠짐없이 포함하세요.
3. 한국어 문장은 일반 텍스트, 수학 수식만 $...$ 또는 $$...$$ 안에 LaTeX로 쓰세요.
4. 각 문단·보기는 줄바꿈으로 구분하세요.
5. problemLatex 안에는 정답·풀이·해설을 넣지 마세요.
6. answer에는 해당 문항의 최종 정답만 쓰세요. 객관식이면 ①②③④⑤ 중 하나.
7. keywords는 관련 단원/개념 한국어 키워드 최대 5개입니다.
8. 확실하지 않으면 answer를 빈 문자열로 두고, 본문은 읽을 수 있는 만큼만 적으세요.
9. JSON 외 다른 텍스트는 출력하지 마세요.

그래프·그림·도형·표 처리 (매우 중요):
- 원본에 그래프, 좌표평면, 기하 도형, 지도, 회로, 삽화, 표가 있으면 글로 풀어서 설명하거나 생략하지 마세요.
- 해당 시각 자료의 경계 상자를 figures에 넣으세요. 사진 전체의 왼쪽 위가 (0,0), 오른쪽 아래가 (1000,1000)입니다.
- 첫 번째 사진은 pageIndex 0, 두 번째 사진은 1입니다.
- 축 이름, 범례, 눈금, 곡선, 도형의 라벨이 모두 들어가도록 약간 넉넉하게 잡되 문제 본문은 최대한 제외하세요.
- problemLatex에서 원래 그림이 있던 위치에 [[FIGURE_1]], [[FIGURE_2]] 표시를 넣으세요.
- figures가 없으면 빈 배열로 반환하세요.

긴 지문·여러 장 사진:
- 국어 지문은 sharedPassage에 전문을 넣으세요. 요약하지 마세요.
- 사진이 여러 장이면 1장→2장 순서대로 이어 읽으세요.

표기 규칙 (한국 시험지 특수 기호 — 매우 중요):
- 원문자는 원본과 똑같은 문자를 쓰세요. 종류를 절대 혼동하지 마세요.
  · 객관식 보기: ①②③④⑤
  · 원 안의 ㄱㄴㄷ: ㉠㉡㉢㉣㉤
  · 원 안의 가나다: ㉮㉯㉰㉱㉲
  · 괄호 라벨: (가)(나)(다), [A][B][C]
- 예: 원 안에 "가"가 있으면 반드시 ㉮로 쓰세요. ㉠으로 바꿔 쓰면 안 됩니다.
- 밑줄 친 부분은 <u>밑줄 내용</u> 처럼 <u> 태그로 감싸세요.
- 빈칸은 "____" 또는 "( ㉠ )"처럼 원본 형태대로 쓰세요.`;

export function normalizeExtractJson(raw: unknown): {
  sharedPassage: string;
  problems: ExtractedProblemItem[];
} {
  const obj =
    typeof raw === "string"
      ? (JSON.parse(stripCodeFence(raw)) as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  const sharedPassage = String(
    obj.sharedPassage ?? obj.shared_passage ?? "",
  ).trim();

  const problemsRaw = obj.problems;
  if (Array.isArray(problemsRaw) && problemsRaw.length > 0) {
    const problems = problemsRaw
      .map((item) => normalizeProblemItem(item))
      .filter((p) => p.problemLatex.length > 0)
      .slice(0, 5);
    if (problems.length > 0) {
      return { sharedPassage, problems };
    }
  }

  // 하위 호환: 예전 단일 객체 { problemLatex, answer, keywords }
  const legacy = normalizeProblemItem(obj);
  if (legacy.problemLatex) {
    return { sharedPassage, problems: [legacy] };
  }

  throw new Error("EMPTY_EXTRACT");
}

function normalizeProblemItem(raw: unknown): ExtractedProblemItem {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    number: String(obj.number ?? obj.no ?? "").trim().slice(0, 20),
    problemLatex: String(obj.problemLatex ?? obj.problem_latex ?? "").trim(),
    answerGuess: String(obj.answer ?? obj.answerGuess ?? "")
      .trim()
      .slice(0, 400),
    keywords: Array.isArray(obj.keywords)
      ? obj.keywords
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    figures: Array.isArray(obj.figures)
      ? obj.figures
          .map((figure) => normalizeFigureRegion(figure))
          .filter((figure): figure is ExtractedFigureRegion => figure !== null)
          .slice(0, 4)
      : [],
  };
}

function normalizeFigureRegion(raw: unknown): ExtractedFigureRegion | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const pageIndex = Math.max(0, Math.floor(Number(obj.pageIndex ?? 0)));
  const x = Math.max(0, Math.min(1000, Number(obj.x ?? 0)));
  const y = Math.max(0, Math.min(1000, Number(obj.y ?? 0)));
  const width = Math.max(0, Math.min(1000 - x, Number(obj.width ?? 0)));
  const height = Math.max(0, Math.min(1000 - y, Number(obj.height ?? 0)));
  if (
    !Number.isFinite(pageIndex) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 20 ||
    height < 20
  ) {
    return null;
  }
  return { pageIndex, x, y, width, height };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}
