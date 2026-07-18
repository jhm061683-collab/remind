export type OcrProviderName = "mock" | "vision" | "gemini" | "openai";

export type OcrExtractResult = {
  provider: OcrProviderName;
  rawText: string;
  /** 문제 본문 (수식 LaTeX 포함). AI 추출 시에만 채워짐 */
  problemLatex?: string;
  /** 폼에 넣을 정답 후보 (없으면 빈 문자열) */
  answerGuess: string;
  /** 키워드 후보 */
  keywords: string[];
  /** 사용자에게 보여줄 짧은 안내 */
  note?: string;
};

export type OcrExtractInput = {
  /** data URL 또는 raw base64 */
  imageDataUrl: string;
};
