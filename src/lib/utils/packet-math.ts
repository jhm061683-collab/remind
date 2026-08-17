/**
 * 오답 모음 PDF 공용 수학 표현 계층.
 * - 느슨한 표기(frac(5)2, sqrt(2), ∥, x^2)를 KaTeX가 이해하는 LaTeX로 정규화
 * - 한글 문장 + 수식이 섞인 문자열을 텍스트/수식 세그먼트로 분리
 *
 * 원문을 바꾸지 않고 "표현 형식"만 정규화한다.
 */

export type MathSegment = { type: "text" | "math"; value: string };

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** 유니코드 수학 기호 → LaTeX 명령 (KaTeX 수식 모드에서 안전) */
const UNICODE_TO_LATEX: [RegExp, string][] = [
  [/[∥‖]/g, "\\parallel "],
  [/[⟂⊥]/g, "\\perp "],
  [/∠/g, "\\angle "],
  [/△/g, "\\triangle "],
  [/[□▭]/g, "\\square "],
  [/▱/g, "\\square "],
  [/∽/g, "\\backsim "],
  [/≡/g, "\\equiv "],
  [/≒|≈/g, "\\approx "],
  [/≤/g, "\\le "],
  [/≥/g, "\\ge "],
  [/≠/g, "\\ne "],
  [/±/g, "\\pm "],
  [/∓/g, "\\mp "],
  [/×/g, "\\times "],
  [/÷/g, "\\div "],
  [/·/g, "\\cdot "],
  [/∞/g, "\\infty "],
  [/∫/g, "\\int "],
  [/∑/g, "\\sum "],
  [/π/g, "\\pi "],
  [/θ/g, "\\theta "],
  [/α/g, "\\alpha "],
  [/β/g, "\\beta "],
  [/γ/g, "\\gamma "],
  [/δ/g, "\\delta "],
  [/°/g, "^{\\circ}"],
  [/→/g, "\\rightarrow "],
  [/⇒/g, "\\Rightarrow "],
  [/∈/g, "\\in "],
  [/∉/g, "\\notin "],
  [/⊂/g, "\\subset "],
  [/⊆/g, "\\subseteq "],
  [/⊃/g, "\\supset "],
  [/⊇/g, "\\supseteq "],
  [/∪/g, "\\cup "],
  [/∩/g, "\\cap "],
  [/∅/g, "\\emptyset "],
  [/∴/g, "\\therefore "],
  [/∵/g, "\\because "],
  [/≅/g, "\\cong "],
];

const FUNCTION_NAMES = [
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "lim",
  "max",
  "min",
];

/** src[start]가 open일 때 짝이 맞는 close 인덱스. 없으면 -1 */
function findBalanced(
  src: string,
  start: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

type ArgRead = { value: string; end: number };

/** `{...}` / `(...)` / 단일 토큰(숫자·문자·\cmd{..}) 하나를 읽는다 */
function readMathArg(src: string, from: number): ArgRead | null {
  let i = from;
  while (i < src.length && /\s/.test(src[i]!)) i += 1;
  if (i >= src.length) return null;

  const ch = src[i]!;
  if (ch === "{" || ch === "(") {
    const close = findBalanced(src, i, ch, ch === "{" ? "}" : ")");
    if (close === -1) return null;
    return { value: src.slice(i + 1, close), end: close + 1 };
  }

  if (ch === "\\") {
    let j = i + 1;
    while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j += 1;
    // 명령 뒤 인자들도 함께
    while (j < src.length && (src[j] === "{" || src[j] === "(")) {
      const close = findBalanced(
        src,
        j,
        src[j]!,
        src[j] === "{" ? "}" : ")",
      );
      if (close === -1) break;
      j = close + 1;
    }
    return { value: src.slice(i, j), end: j };
  }

  const numeric = /^-?\d+(?:\.\d+)?/.exec(src.slice(i));
  if (numeric) {
    return { value: numeric[0], end: i + numeric[0].length };
  }
  if (/[A-Za-z]/.test(ch)) {
    return { value: ch, end: i + 1 };
  }
  return null;
}

/** `frac(5)2` · `frac{5}{2}` · `\frac(5)(2)` → `\frac{5}{2}` */
function normalizeLooseFrac(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf("frac", i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    const hasBackslash = idx > 0 && src[idx - 1] === "\\";
    const cmdStart = hasBackslash ? idx - 1 : idx;
    // 다른 낱말의 일부(예: fraction)면 건너뜀
    const after = src[idx + 4];
    const before = hasBackslash ? "" : src[idx - 1] ?? "";
    if (
      (before && /[A-Za-z]/.test(before)) ||
      (after && /[a-zA-Z]/.test(after))
    ) {
      out += src.slice(i, idx + 4);
      i = idx + 4;
      continue;
    }

    out += src.slice(i, cmdStart);
    const num = readMathArg(src, idx + 4);
    const den = num ? readMathArg(src, num.end) : null;
    if (!num || !den) {
      out += src.slice(cmdStart, idx + 4);
      i = idx + 4;
      continue;
    }
    out += `\\frac{${normalizeMathExpression(num.value)}}{${normalizeMathExpression(
      den.value,
    )}}`;
    i = den.end;
  }
  return out;
}

/** `sqrt(2)` · `√2` · `√(x+1)` → `\sqrt{2}` */
function normalizeLooseSqrt(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const sqrtIdx = src.indexOf("sqrt", i);
    const rootIdx = src.indexOf("√", i);
    const idx =
      sqrtIdx === -1
        ? rootIdx
        : rootIdx === -1
          ? sqrtIdx
          : Math.min(sqrtIdx, rootIdx);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    const isWord = idx === sqrtIdx && sqrtIdx !== -1;
    const tokenLength = isWord ? 4 : 1;
    const hasBackslash = isWord && idx > 0 && src[idx - 1] === "\\";
    const cmdStart = hasBackslash ? idx - 1 : idx;
    const before = hasBackslash ? "" : src[idx - 1] ?? "";
    if (isWord && before && /[A-Za-z]/.test(before)) {
      out += src.slice(i, idx + tokenLength);
      i = idx + tokenLength;
      continue;
    }

    out += src.slice(i, cmdStart);
    const arg = readMathArg(src, idx + tokenLength);
    if (!arg) {
      out += "\\sqrt{}";
      i = idx + tokenLength;
      continue;
    }
    out += `\\sqrt{${normalizeMathExpression(arg.value)}}`;
    i = arg.end;
  }
  return out;
}

function escapeFunctionNames(src: string): string {
  let s = src;
  for (const name of FUNCTION_NAMES) {
    s = s.replace(
      new RegExp(`(^|[^\\\\a-zA-Z])(${name})(?![a-zA-Z])`, "g"),
      (_m, pre: string, fn: string) => `${pre}\\${fn}`,
    );
  }
  return s;
}

/**
 * 느슨한 수학 표기를 KaTeX가 읽을 수 있는 LaTeX로 정규화한다.
 * 이미 올바른 LaTeX면 거의 그대로 통과한다.
 */
export function normalizeMathExpression(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) return "";

  s = s.replace(/^\$\$([\s\S]*)\$\$$/, "$1").replace(/^\$([\s\S]*)\$$/, "$1");
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, " ");

  s = normalizeLooseFrac(s);
  s = normalizeLooseSqrt(s);

  // 선분·평행: `AD || BC` (문자 사이의 `||`만 평행으로)
  s = s.replace(
    /([A-Za-z0-9}\)\s])\|\|([\sA-Za-z0-9{\\(])/g,
    "$1\\parallel $2",
  );

  for (const [pattern, replacement] of UNICODE_TO_LATEX) {
    s = s.replace(pattern, replacement);
  }

  s = s.replace(/[⁰-⁹]+/g, (run) =>
    `^{${[...run].map((c) => SUPERSCRIPT_DIGITS[c] ?? "").join("")}}`,
  );

  s = escapeFunctionNames(s);

  // `x^23` 같은 다중 문자 지수는 KaTeX가 첫 글자만 올리므로 묶어 준다
  s = s.replace(/\^(-?\d{2,})/g, "^{$1}");
  s = s.replace(/_(-?\d{2,})/g, "_{$1}");

  return s.replace(/\s{2,}/g, " ").trim();
}

/** `(10, 0)` · `(a, b)` 같은 좌표쌍 */
const COORDINATE_PAIR =
  /\(\s*-?(?:\d+(?:\.\d+)?|[A-Za-z])\s*,\s*-?(?:\d+(?:\.\d+)?|[A-Za-z])\s*\)/;

/** 수학 표현이 들어 있는지 (순수 한글/숫자 문자열은 false) */
export function containsMathExpression(raw: string): boolean {
  const s = (raw ?? "").trim();
  if (!s) return false;
  if (/^[0-9]+$/.test(s)) return false;
  if (/\\[a-zA-Z]+/.test(s)) return true;
  if (/\$/.test(s)) return true;
  if (/[∥‖⊥⟂∠√∫∑≤≥≠±∞π△▱□∽≡°⁰-⁹∈∉⊂⊆⊃⊇∪∩∅∴∵≅≈]/.test(s)) return true;
  if (/\^|_\{/.test(s)) return true;
  if (/[A-Za-z]_[0-9A-Za-z]/.test(s)) return true;
  if (/\b(?:frac|sqrt|log|ln|sin|cos|tan)\s*[({]/i.test(s)) return true;
  if (/\d\s*\/\s*\d/.test(s)) return true;
  if (/[A-Za-z]\s*[=<>]/.test(s)) return true;
  if (/\d[A-Za-z]/.test(s)) return true;
  if (/[A-Za-z]\s*[+\-*/]\s*[A-Za-z0-9]/.test(s)) return true;
  // 좌표쌍 (10, 0) · (a, b) — 한글이 섞인 (단, …) 같은 문구는 제외
  if (COORDINATE_PAIR.test(s)) return true;
  return false;
}

function pushSegment(
  segments: MathSegment[],
  type: MathSegment["type"],
  value: string,
): void {
  if (!value.trim()) return;
  segments.push({
    type,
    value: type === "math" ? normalizeMathExpression(value) : value,
  });
}

/** `$…$` 밖의 구간을 한글(텍스트)/수식으로 더 잘게 나눔 */
function splitPlainRun(run: string, segments: MathSegment[]): void {
  const HANGUL_RUN = /[가-힣][가-힣\s,·]*/g;
  let cursor = 0;
  for (const match of run.matchAll(HANGUL_RUN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      const gap = run.slice(cursor, index);
      pushSegment(segments, containsMathExpression(gap) ? "math" : "text", gap);
    }
    pushSegment(segments, "text", match[0]!);
    cursor = index + match[0].length;
  }
  if (cursor < run.length) {
    const gap = run.slice(cursor);
    pushSegment(segments, containsMathExpression(gap) ? "math" : "text", gap);
  }
}

/** 한글 텍스트 + 수식이 섞인 문자열 → 세그먼트 (순서·내용 보존) */
export function splitMixedMathSegments(raw: string): MathSegment[] {
  const source = (raw ?? "").trim();
  if (!source) return [];
  const segments: MathSegment[] = [];
  const MATH_DELIM = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let cursor = 0;
  for (const match of source.matchAll(MATH_DELIM)) {
    const index = match.index ?? 0;
    if (index > cursor) splitPlainRun(source.slice(cursor, index), segments);
    pushSegment(segments, "math", match[1] ?? match[2] ?? "");
    cursor = index + match[0].length;
  }
  if (cursor < source.length) splitPlainRun(source.slice(cursor), segments);
  return segments;
}

export type QuickAnswerPlan =
  | { kind: "status"; text: string }
  | { kind: "plain"; text: string }
  | { kind: "math"; segments: MathSegment[] };

const STATUS_ANSWER = /^(미등록|미공개|없음|모름)$/;

/**
 * 빠른정답 셀 렌더링 계획.
 * - 상태 문자열(미등록·미공개·***)은 그대로 텍스트
 * - 순수 숫자·짧은 한글은 텍스트
 * - 수식이 섞이면 텍스트/수식 세그먼트로 분리해 수학 렌더링
 */
export function parseMathLikeAnswer(raw?: string | null): QuickAnswerPlan {
  const source = (raw ?? "").trim();
  if (!source) return { kind: "status", text: "미등록" };
  if (STATUS_ANSWER.test(source)) return { kind: "status", text: source };
  if (/^\*{2,}$/.test(source)) return { kind: "status", text: source };

  const bare = source
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .trim();

  if (/^-?\d+(?:\.\d+)?$/.test(bare)) return { kind: "plain", text: bare };
  if (!containsMathExpression(source)) return { kind: "plain", text: source };

  const segments = splitMixedMathSegments(source);
  if (segments.length === 0) return { kind: "plain", text: source };
  if (!segments.some((seg) => seg.type === "math")) {
    return { kind: "plain", text: source };
  }
  return { kind: "math", segments };
}

/**
 * `$…$` 밖에 있는 맨몸 수학 구간(AD ∥ BC, √2 등)을 수식으로 감싼다.
 * 한글 문장은 건드리지 않는다.
 */
export function wrapBareMathRuns(text: string): string {
  let s = text;
  // A∥B, ∠ABC, AB⊥CD 같은 기하 표현
  s = s.replace(
    /([A-Za-z][A-Za-z0-9]{0,3})\s*([∥‖⊥⟂])\s*([A-Za-z][A-Za-z0-9]{0,3})/g,
    (_m, a: string, op: string, b: string) =>
      `$\\overline{\\mathrm{${a}}} ${op === "∥" || op === "‖" ? "\\parallel" : "\\perp"} \\overline{\\mathrm{${b}}}$`,
  );
  s = s.replace(
    /∠\s*([A-Za-z][A-Za-z0-9]{0,3})/g,
    (_m, a: string) => `$\\angle \\mathrm{${a}}$`,
  );
  s = s.replace(
    /√\s*(\d+|\([^()]{1,20}\))/g,
    (_m, a: string) =>
      `$\\sqrt{${a.startsWith("(") ? a.slice(1, -1) : a}}$`,
  );
  return s;
}

/**
 * 텍스트 전용 출력(PDF 본문 폰트)용: `\frac`·`\sqrt`를 중첩까지 안전히 풀어 쓴다.
 * `\frac{\sqrt{5}}{2}` → `(√(5))/(2)`
 */
export function expandFracSqrtToText(src: string): string {
  let s = src;
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s.startsWith("\\frac", i)) {
        const num = readMathArg(s, i + 5);
        const den = num ? readMathArg(s, num.end) : null;
        if (num && den) {
          out += `(${num.value})/(${den.value})`;
          i = den.end;
          changed = true;
          continue;
        }
      }
      if (s.startsWith("\\sqrt", i)) {
        const arg = readMathArg(s, i + 5);
        if (arg) {
          out += `√(${arg.value})`;
          i = arg.end;
          changed = true;
          continue;
        }
      }
      out += s[i];
      i += 1;
    }
    s = out;
    if (!changed) break;
  }
  return s;
}
