/** 수학 문항에서 (가)(나)(다)·ㄱㄴㄷ 조건만 박스로 분리 */

export type MathLayoutPart = {
  kind: "body" | "condition";
  content: string;
};

/** 조건 한 줄: (가) … / （나）… / ㄱ. … / ㄴ) … */
const CONDITION_LINE =
  /^[ \t]*(?:\([가-힣]\)|（[가-힣]）|[ㄱ-ㅎ][\.．)])[ \t]+\S/;

/** 「구하시오 · [4점]」 등 — 조건이 아니라 문제 요구문 */
function isAskOrScoreLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /구하(?:시오|라|여라)?/.test(t) ||
    /구하여라|구하시오|구하라/.test(t) ||
    /\[[\s]*\d+\s*점[\s]*\]/.test(t) ||
    /\d+\s*점\s*$/.test(t) ||
    /값을\s*구/.test(t) ||
    /의\s*값을/.test(t) ||
    /쓰시오|보이시오|설명하시오|고르시오/.test(t) ||
    /최댓값이|최솟값이/.test(t)
  );
}

/** `\text{...}` / `\mathrm{...}` 균형 괄호 추출 */
function extractBraceCommand(
  src: string,
  start: number,
  cmd: "text" | "mathrm",
): { content: string; end: number } | null {
  const prefix = cmd === "text" ? "\\text{" : "\\mathrm{";
  if (!src.startsWith(prefix, start)) return null;
  const openBrace = start + prefix.length - 1;
  let depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { content: src.slice(openBrace + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function flattenAllTextCommands(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const text = extractBraceCommand(src, i, "text");
    if (text) {
      out += text.content;
      i = text.end;
      continue;
    }
    const mathrm = extractBraceCommand(src, i, "mathrm");
    if (mathrm) {
      out += mathrm.content;
      i = mathrm.end;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

function cleanupLatexSpacing(s: string): string {
  return s
    .replace(/\\q?quad/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\!/g, "")
    .replace(/\\ /g, " ")
    .replace(/~/g, " ")
    .replace(/\{\s*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 남은 LaTeX 명령을 `$...$`로 감싸되, 한글은 밖으로 */
function wrapRemainingLatex(plain: string): string {
  if (!/\\[a-zA-Z]/.test(plain)) return plain;
  // 한글·라벨 구간은 텍스트, 수식 명령 구간은 $...$
  const parts: string[] = [];
  let buf = "";
  let mode: "text" | "math" | null = null;

  const flush = () => {
    const t = buf.trim();
    if (!t) {
      buf = "";
      return;
    }
    if (mode === "math") parts.push(`$${t}$`);
    else parts.push(t);
    buf = "";
  };

  for (let i = 0; i < plain.length; ) {
    const ch = plain[i]!;
    const isHangul = /[가-힣]/.test(ch);
    const startsCmd = plain[i] === "\\" && /[a-zA-Z]/.test(plain[i + 1] ?? "");
    const nextMode: "text" | "math" = isHangul
      ? "text"
      : startsCmd || /[_^{}\\]/.test(ch)
        ? "math"
        : (mode ?? "text");

    if (mode !== null && nextMode !== mode && buf.trim()) {
      // 공백은 모드 전환 허용
      if (ch === " " || ch === "\t") {
        flush();
        mode = null;
        i += 1;
        parts.push(" ");
        continue;
      }
      flush();
    }
    mode = nextMode === "math" || startsCmd ? "math" : isHangul ? "text" : mode ?? "text";
    if (startsCmd) {
      // 명령 전체 + 선택적 인자
      let j = i + 1;
      while (j < plain.length && /[a-zA-Z]/.test(plain[j]!)) j += 1;
      buf += plain.slice(i, j);
      i = j;
      while (i < plain.length && plain[i] === "{") {
        let depth = 0;
        let k = i;
        for (; k < plain.length; k++) {
          if (plain[k] === "{") depth += 1;
          else if (plain[k] === "}") {
            depth -= 1;
            if (depth === 0) {
              k += 1;
              break;
            }
          }
        }
        buf += plain.slice(i, k);
        i = k;
      }
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function convertAlignedRowToLine(row: string): string {
  const s = row.replace(/^&\s*/, "").trim();
  if (!s) return "";

  let label = "";
  let rest = s;

  // `\text{(가) }` / `\text{(나) 삼각형 }` 라벨 분리
  const firstText = extractBraceCommand(s, 0, "text");
  if (firstText) {
    const m = firstText.content.match(/^(\([가-힣]\))\s*(.*)$/);
    if (m) {
      label = m[1]!;
      const afterInText = (m[2] ?? "").trim();
      rest = `${afterInText}${s.slice(firstText.end)}`.trim();
    }
  } else {
    const bare = s.match(/^(\([가-힣]\))\s*(.*)$/);
    if (bare) {
      label = bare[1]!;
      rest = (bare[2] ?? "").trim();
    }
  }

  const hasHeavyMath =
    /\\sin|\\cos|\\tan|\\frac|\\sqrt|\\angle|\\sum|\\int|\\lim|\\cdot|\\times/.test(
      rest,
    );

  if (hasHeavyMath) {
    // 식별자 \text{APC} 는 수식 안에 유지
    const math = cleanupLatexSpacing(rest.replace(/^&\s*/, ""));
    if (!math) return label;
    return `${label} $${math}$`.replace(/\s+/g, " ").trim();
  }

  // 서술형 조건: \text{} → 평문
  let plain = cleanupLatexSpacing(flattenAllTextCommands(rest));
  // 남은 `4` 같은 숫자는 그대로, 명령만 wrap
  if (/\\[a-zA-Z]/.test(plain)) {
    plain = wrapRemainingLatex(plain);
  }
  return `${label} ${plain}`.replace(/\s+/g, " ").trim();
}

function isQuadContinuation(row: string): boolean {
  const t = row.replace(/^&\s*/, "").trim();
  return /^\\q?quad/.test(t);
}

/**
 * `$$\begin{aligned}...\end{aligned}$$` 안의 (가)/(나) 조건을
 * 캡처 폭에 맞게 줄 단위로 펼친다. (overflow clipping 방지)
 */
export function flattenAlignedConditions(content: string): string {
  const ALIGNED_BLOCK =
    /\$\$\s*\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}\s*\$\$/g;

  return content.replace(ALIGNED_BLOCK, (full, inner: string) => {
    // (가)/(나) 조건이 없으면 그대로
    const hasCondition =
      /\\text\{\([가-힣]\)/.test(inner) ||
      /\([가-힣]\)/.test(inner) ||
      /（[가-힣]）/.test(inner);
    if (!hasCondition) return full;

    const rawRows = inner.split(/\\\\/);
    const rows: string[] = [];
    for (const raw of rawRows) {
      const row = raw.trim();
      if (!row) continue;
      if (isQuadContinuation(row) && rows.length > 0) {
        const cont = row
          .replace(/^&\s*/, "")
          .replace(/^\\q?quad\s*/, "")
          .trim();
        const contLine = convertAlignedRowToLine(cont);
        // convertAlignedRowToLine may not find label — strip empty label artifacts
        const mergedCont = contLine.replace(/^\([가-힣]\)\s*/, "").trim() ||
          cleanupLatexSpacing(flattenAllTextCommands(cont));
        rows[rows.length - 1] = `${rows[rows.length - 1]} ${mergedCont}`.replace(
          /\s+/g,
          " ",
        ).trim();
        continue;
      }
      const line = convertAlignedRowToLine(row);
      if (line) rows.push(line);
    }

    if (rows.length === 0) return full;
    return `\n${rows.join("\n")}\n`;
  });
}

/**
 * 문제 본문 안의 「조건」만 박스로 분리한다.
 * - (가)(나)(다) 또는 ㄱ,ㄴ,ㄷ 연속 나열만 조건
 * - 문제 문장·「다음 조건을 만족」·(단, …)·「구하시오 [4점]」은 본문
 */
export function splitMathConditionParts(content: string): MathLayoutPart[] {
  const raw = content.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  // (다) … 값을 구하시오. [4점] 처럼 한 줄에 붙은 요구문은 줄 분리
  const lines = raw.split("\n").flatMap((line) => {
    if (!CONDITION_LINE.test(line)) return [line];
    const askMatch = line.match(
      /구하(?:시오|라|여라)?|값을\s*구|의\s*값을|쓰시오|보이시오|고르시오|\[[\s]*\d+\s*점[\s]*\]/,
    );
    if (!askMatch || askMatch.index == null || askMatch.index < 3) return [line];

    let splitAt = askMatch.index;
    const before = line.slice(0, splitAt);
    // 요구문 직전 수식 $…$ 도 박스 밖으로
    const lastDollar = before.lastIndexOf("$");
    if (lastDollar > 0) {
      const openDollar = before.lastIndexOf("$", lastDollar - 1);
      if (openDollar >= 0) splitAt = openDollar;
    } else {
      const ws = before.search(/\s\S*$/);
      if (ws > 0) splitAt = ws;
    }

    const head = line.slice(0, splitAt).trimEnd();
    const tail = line.slice(splitAt).trimStart();
    if (head && tail && isAskOrScoreLine(tail) && CONDITION_LINE.test(head)) {
      return [head, tail];
    }
    return [line];
  });
  type Span = { start: number; end: number };
  const spans: Span[] = [];

  let i = 0;
  while (i < lines.length) {
    if (!CONDITION_LINE.test(lines[i]!) || isAskOrScoreLine(lines[i]!)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < lines.length) {
      const line = lines[j]!;
      if (isAskOrScoreLine(line)) break;
      if (CONDITION_LINE.test(line)) {
        j += 1;
        continue;
      }
      // 이어쓰기: 들여쓴 줄만. $…$ / 구하시오 줄은 조건이 아니라 본문(박스 밖)
      if (
        j > i &&
        line.trim() !== "" &&
        !/^(?:\d+[\.．)]|[（(]\s*단\s*[,，]|단답형|다음을)/.test(line.trim()) &&
        /^[ \t]{2,}\S/.test(line)
      ) {
        j += 1;
        continue;
      }
      break;
    }
    const itemCount = lines
      .slice(i, j)
      .filter((l) => CONDITION_LINE.test(l)).length;
    if (itemCount >= 2) {
      spans.push({ start: i, end: j });
    }
    i = Math.max(j, i + 1);
  }

  if (spans.length === 0) {
    return [{ kind: "body", content: raw }];
  }

  const parts: MathLayoutPart[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      const body = lines.slice(cursor, span.start).join("\n").trim();
      if (body) parts.push({ kind: "body", content: body });
    }
    const cond = lines.slice(span.start, span.end).join("\n").trim();
    if (cond) parts.push({ kind: "condition", content: cond });
    cursor = span.end;
  }
  if (cursor < lines.length) {
    const tail = lines.slice(cursor).join("\n").trim();
    if (tail) parts.push({ kind: "body", content: tail });
  }

  return parts.length > 0 ? parts : [{ kind: "body", content: raw }];
}
