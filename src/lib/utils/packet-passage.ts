/** 국어·영어 지문 / 문항 분리 (AI 없이 휴리스틱 + DB 저장값) */

export type PassageSplit = {
  passage?: string;
  body: string;
};

/**
 * 저장된 shared_passage가 있으면 우선 사용.
 * 없으면 「다음 글을 읽고」류 패턴으로 지문·문항을 나눈다 (비용 0).
 */
export function splitPassageAndBody(
  problemLatex?: string,
  sharedPassage?: string | null,
): PassageSplit {
  const full = (problemLatex ?? "").trim();
  const stored = (sharedPassage ?? "").trim();

  if (stored) {
    let body = full;
    if (body.startsWith(stored)) {
      body = body.slice(stored.length).replace(/^\s+/, "");
    }
    return { passage: stored, body: body || full };
  }

  if (!full) return { body: "" };

  // [1~6] 다음 글을 읽고 … / 다음 지문을 읽고 …
  const hasPassageCue =
    /(?:다음\s*글|다음\s*지문|아래\s*글|다음을\s*읽고|글을\s*읽고|Read\s+the\s+(?:following|passage)|passage)/i.test(
      full,
    );
  if (!hasPassageCue) return { body: full };

  // 문항 시작: 1. / 1) / ① / Q1
  const qMatch = full.match(
    /\n\s*((?:[1-9]\d*[\.．\)]\s+\S)|(?:[①-⑳]\s*\S)|(?:Q\s*[1-9]\d*[.．:]?\s*\S))/i,
  );
  if (!qMatch || qMatch.index === undefined || qMatch.index < 60) {
    return { body: full };
  }

  const passage = full.slice(0, qMatch.index).trim();
  const body = full.slice(qMatch.index).trim();
  if (passage.length < 40) return { body: full };
  return { passage, body };
}
