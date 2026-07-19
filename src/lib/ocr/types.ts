export type OcrProviderName = "mock" | "vision" | "gemini" | "openai";

export type OcrProblemDraft = {
  number: string;
  problemLatex: string;
  answerGuess: string;
  keywords: string[];
};

export type OcrExtractResult = {
  provider: OcrProviderName;
  rawText: string;
  /** 공통 지문 (국어 등). 없으면 빈 문자열/미정의 */
  sharedPassage?: string;
  /** 분리된 문항 (1~5개) */
  problems?: OcrProblemDraft[];
  /** 문제 본문 (수식 LaTeX 포함). AI 추출 시에만 채워짐 — 첫 문항 기준 */
  problemLatex?: string;
  /** 폼에 넣을 정답 후보 (없으면 빈 문자열) — 첫 문항 기준 */
  answerGuess: string;
  /** 키워드 후보 — 첫 문항 기준 */
  keywords: string[];
  /** 사용자에게 보여줄 짧은 안내 */
  note?: string;
};

export type OcrExtractInput = {
  /** data URL 또는 raw base64 */
  imageDataUrl: string;
};
