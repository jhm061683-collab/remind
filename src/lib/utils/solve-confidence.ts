/** 풀 때 느낌(확신도) — 분석용 선택 메타데이터 */

export const SOLVE_CONFIDENCE_OPTIONS = [
  { value: "unknown", label: "모르겠음", emoji: "😕" },
  { value: "unsure", label: "애매함", emoji: "🤔" },
  { value: "known", label: "알겠음", emoji: "🙂" },
] as const;

export type SolveConfidence =
  (typeof SOLVE_CONFIDENCE_OPTIONS)[number]["value"];

const TAG_RE = /^\[풀때느낌:(모르겠음|애매함|알겠음)\]\s*/;

const VALUE_TO_LABEL: Record<SolveConfidence, string> = {
  unknown: "모르겠음",
  unsure: "애매함",
  known: "알겠음",
};

const LABEL_TO_VALUE: Record<string, SolveConfidence> = {
  모르겠음: "unknown",
  애매함: "unsure",
  알겠음: "known",
};

export function encodeSolveConfidenceMemo(
  confidence: SolveConfidence | "",
  memo: string,
): string | undefined {
  const body = memo.trim();
  if (!confidence) return body || undefined;
  const tag = `[풀때느낌:${VALUE_TO_LABEL[confidence]}]`;
  return body ? `${tag}\n${body}` : tag;
}

export function parseSolveConfidenceMemo(raw: string | null | undefined): {
  confidence: SolveConfidence | "";
  memo: string;
} {
  const text = (raw ?? "").trim();
  if (!text) return { confidence: "", memo: "" };
  const match = text.match(TAG_RE);
  if (!match) return { confidence: "", memo: text };
  const label = match[1] ?? "";
  return {
    confidence: LABEL_TO_VALUE[label] ?? "",
    memo: text.slice(match[0].length).trim(),
  };
}
