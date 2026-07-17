import type { OcrExtractResult } from "@/lib/ocr/types";

/** 인식 텍스트에서 정답·키워드 후보를 느슨하게 뽑음 */
export function parseOcrText(rawText: string): Pick<
  OcrExtractResult,
  "answerGuess" | "keywords"
> {
  const text = rawText.replace(/\r/g, "").trim();
  if (!text) return { answerGuess: "", keywords: [] };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let answerGuess = "";

  const answerLine = lines.find((line) =>
    /^(정답|답|answer)\s*[:：]?\s*/i.test(line),
  );
  if (answerLine) {
    answerGuess = answerLine
      .replace(/^(정답|답|answer)\s*[:：]?\s*/i, "")
      .trim();
  }

  if (!answerGuess) {
    const circled = text.match(/[①②③④⑤⑥⑦⑧⑨⑩]/);
    if (circled) answerGuess = circled[0];
  }

  if (!answerGuess) {
    const choice = text.match(/(?:정답|답)\s*[:：]?\s*([1-5]|[가-힣]|[A-Ea-e])/i);
    if (choice?.[1]) answerGuess = choice[1];
  }

  if (!answerGuess) {
    const eq = text.match(/\b([xy]=-?\d+(?:\.\d+)?)\b/i);
    if (eq?.[1]) answerGuess = eq[1];
  }

  const keywords: string[] = [];
  const keywordHints = [
    "이차함수",
    "삼각함수",
    "미분",
    "적분",
    "확률",
    "통계",
    "기하",
    "수열",
    "벡터",
    "행렬",
    "방정식",
    "부등식",
  ];
  for (const hint of keywordHints) {
    if (text.includes(hint) && !keywords.includes(hint)) {
      keywords.push(hint);
    }
  }

  return {
    answerGuess: answerGuess.slice(0, 80),
    keywords: keywords.slice(0, 5),
  };
}

export function stripDataUrlBase64(imageDataUrl: string): string {
  const trimmed = imageDataUrl.trim();
  const idx = trimmed.indexOf("base64,");
  if (idx >= 0) return trimmed.slice(idx + "base64,".length);
  return trimmed;
}
