/** 오답 모음 PDF용: LaTeX/FIGURE 원문을 텍스트·그림 URL로 나눔 */

import { expandFracSqrtToText } from "./packet-math";

const FIGURE_PATTERN =
  /\[\[FIGURE:([^\]]+)\]\]|\[\[FIGURE_MISSING\]\]/g;

export type PacketContentPart =
  | { type: "text"; text: string }
  | { type: "figure"; url: string }
  | { type: "figureMissing" };

export function isSafeFigureUrl(url: string): boolean {
  return (
    /^https:\/\//i.test(url) ||
    /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(url)
  );
}

/**
 * FIGURE 토큰만 분리한다. 텍스트는 LaTeX 원문 그대로 유지하므로
 * KaTeX 캡처처럼 원문이 필요한 경로에서 쓴다.
 */
export function splitFigureParts(content?: string): PacketContentPart[] {
  if (!content?.trim()) return [];
  const parts: PacketContentPart[] = [];
  let cursor = 0;
  for (const match of content.matchAll(FIGURE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ type: "text", text: content.slice(cursor, index) });
    }
    const url = match[1]?.trim() ?? "";
    if (url && isSafeFigureUrl(url)) {
      parts.push({ type: "figure", url });
    } else {
      parts.push({ type: "figureMissing" });
    }
    cursor = index + match[0].length;
  }
  if (cursor < content.length) {
    parts.push({ type: "text", text: content.slice(cursor) });
  }
  return parts;
}

/** 본문에 들어 있는 문항 그림 URL */
export function extractFigureUrls(content?: string): string[] {
  return splitFigureParts(content)
    .filter((p): p is { type: "figure"; url: string } => p.type === "figure")
    .map((p) => p.url);
}

function circledNumber(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);
  return `${n}.`;
}

/**
 * 객관식 선택지/정답 마커 하나만 ①~⑤로 정규화.
 * 선택지가 아닌 일반 텍스트면 null.
 */
export function normalizeChoiceMarker(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  t = t.replace(/[\u200b\u200c\u200d\ufeff]/g, "");
  t = t.replace(/[ａ-ｅ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff41 + 0x61),
  );
  t = t.replace(/[Ａ-Ｅ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff21 + 0x41),
  );
  t = t.replace(/｀/g, "`");
  if (/^[\u2460-\u2473]$/.test(t)) return t;
  if (/^[\u2776-\u277f]$/.test(t)) {
    return circledNumber(t.charCodeAt(0) - 0x2776 + 1);
  }
  if (/^[\u24f5-\u24fe]$/.test(t)) {
    return circledNumber(t.charCodeAt(0) - 0x24f5 + 1);
  }
  if (/^[\u2474-\u2487]$/.test(t)) {
    return circledNumber(t.charCodeAt(0) - 0x2474 + 1);
  }

  t = t.replace(/^[(\[]/, "").replace(/[)\]\.．,，]+$/, "").trim();
  if (!t) return null;

  if (/^[`´''′\*·•∙･]$/.test(t)) return "①";
  // OCR 수능 보기: ` a b c d → ①②③④⑤ (a≠①)
  if (/^[a-e]$/i.test(t)) {
    const shift: Record<string, number> = {
      a: 2,
      b: 3,
      c: 4,
      d: 5,
      e: 5,
    };
    return circledNumber(shift[t.toLowerCase()] ?? 1);
  }
  if (/^[1-5]$/.test(t)) return circledNumber(Number(t));
  return null;
}

/**
 * 빠른정답용: 객관식 마커만 ①~⑤로.
 * 미등록·수식·서술형은 그대로.
 */
export function normalizeMcAnswer(raw?: string | null): string {
  const original = (raw ?? "").trim();
  if (!original) return "미등록";
  if (/^(미등록|미공개|없음)$/i.test(original)) return original;
  if (/^\*{2,}$/.test(original)) return original;

  const compact = original.replace(/\s+/g, "");
  if (compact.length <= 4) {
    const marked = normalizeChoiceMarker(original);
    if (marked) return marked;
    const unwrapped = original
      .replace(/^\$\\?mathrm\{([a-eA-E1-5])\}\$$/i, "$1")
      .replace(/^\$\\?text\{([a-eA-E1-5])\}\$$/i, "$1")
      .replace(/^\$([a-eA-E1-5])\$$/i, "$1")
      .replace(/^\\text\{([a-eA-E1-5])\}$/i, "$1");
    const again = normalizeChoiceMarker(unwrapped);
    if (again) return again;
  }
  return original;
}

/** 수식·LaTeX가 많아 텍스트 변환으로는 부족한 문항 */
export function isMathHeavyContent(content?: string): boolean {
  if (!content?.trim()) return false;

  const looksLikeVerbalMc =
    /적절한\s*것은|고르면|윗글에서|다음\s*글에서|밑줄\s*친|보기의\s*ㄱ|main\s*idea|most\s*appropriate/i.test(
      content,
    ) && !/\\frac|\\int|\\sum|\\sqrt|\\begin\{|\\lim|\\partial/.test(content);
  if (looksLikeVerbalMc) return false;

  const withoutChoiceDollars = content
    .replace(
      /(?:^|[\n<])[\t ]*(?:\$\$|\$|\\\()[ \t]*[`´''′a-eA-E1-5][ \t]*(?:\$\$|\$|\\\))/gm,
      "\n",
    )
    .replace(/<br\s*\/?>/gi, "\n");
  if (
    /\$\$|\$|\\\(|\\\[|\\begin|\\frac|\\sum|\\int|\\sqrt|\\angle|\\cdot|\\times|\\leq|\\geq|\\neq|\\pm|\\infty|\\pi|\\theta|\\alpha|\\beta|\\gamma|\\delta|\\log|\\ln|\\sin|\\cos|\\tan|\\mathrm|\\mathbf|\\text|\\quad|\\qquad|\\left|\\right/.test(
      withoutChoiceDollars,
    )
  ) {
    return true;
  }
  const scripts = withoutChoiceDollars.match(/[_^]/g);
  return (scripts?.length ?? 0) >= 3;
}

/**
 * 객관식 선택지 번호를 ①②③… 로 맞춤.
 * OCR이 ` a b c d / a(가) / $a$(가) / <br> 구분 도 처리.
 */
export function renumberChoiceOptions(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n");
  s = s.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
  s = s.replace(/[\u200b\u200c\u200d\ufeff]/g, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/\\n/g, "\n");
  s = s.replace(/\\\\[ \t]*\n/g, "\n");
  s = s.replace(
    /\\\\[ \t]*(?=(?:\$\$|\$|\\\()?[ \t]*(?:[`´''′\*·•∙･｀]|[a-eA-Eａ-ｅ]|\\(?:text|mathrm|mathbf)\{[a-eA-E]\}|[1-5][\.．)]|[\u2460-\u2464]))/g,
    "\n",
  );
  s = s.replace(/\\\\[ \t]*$/gm, "");
  s = s.replace(/[ａ-ｅ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff41 + 0x61),
  );
  s = s.replace(/[Ａ-Ｅ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff21 + 0x41),
  );
  s = s.replace(/｀/g, "`");

  s = s.replace(
    /^([\t ]*)(?:\$\$|\$|\\\()[ \t]*([`´''′\*·•∙･a-eA-E1-5])[ \t]*(?:\$\$|\$|\\\))[ \t]*/gm,
    "$1$2 ",
  );
  s = s.replace(
    /^([\t ]*)\\(?:text|mathrm|mathbf|textrm)\{\s*([`´''′a-eA-E1-5])\s*\}[ \t]*/gm,
    "$1$2 ",
  );

  const lines = s.split("\n");
  const optionStart =
    /^([\t ]*)([`´''′\*·•∙･]|[a-eA-E]|\([a-eA-E]\)|[1-9]\d*[\.．)]|[\u2460-\u2473\u2474-\u2487\u2776-\u277f\u24f5-\u24fe]|\([1-9][0-9]?\))[ \t\.．)]*(.*\S.*)$/;

  const isStemLine = (line: string): boolean =>
    /[?？]\s*$/.test(line.trim()) ||
    /적절한\s*것은|고르면|맞는\s*것|옳지\s*않은|해당되는|설명으로|main\s*idea/i.test(
      line,
    );

  let i = 0;
  while (i < lines.length) {
    if (!optionStart.test(lines[i]!)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < lines.length && optionStart.test(lines[j]!)) j += 1;
    let start = i;
    let count = j - i;

    if (count >= 5 && isStemLine(lines[i]!)) {
      start = i + 1;
      count -= 1;
    }

    if (count >= 4 && count <= 10) {
      for (let k = 0; k < count; k++) {
        const line = lines[start + k]!;
        const m = line.match(optionStart);
        if (!m) continue;
        const rest = (m[3] ?? "").trim();
        lines[start + k] = `${m[1] ?? ""}${circledNumber(k + 1)} ${rest}`;
      }
    }
    i = j;
  }
  return lines.join("\n");
}

/** PDF 본문용 정리. ①-⑳ 유지 + 객관식 원문자화 */
export function normalizePacketPlainText(raw: string): string {
  let s = raw;

  s = s.replace(/[\u2776-\u277f]/g, (ch) => {
    const n = ch.charCodeAt(0) - 0x2776 + 1;
    return String.fromCharCode(0x2460 + n - 1);
  });
  s = s.replace(/[\u24f5-\u24fe]/g, (ch) => {
    const n = ch.charCodeAt(0) - 0x24f5 + 1;
    return String.fromCharCode(0x2460 + n - 1);
  });
  s = s.replace(/[\u2474-\u2487]/g, (ch) => {
    const n = ch.charCodeAt(0) - 0x2474 + 1;
    return String.fromCharCode(0x2460 + n - 1);
  });
  s = s.replace(/[\u2488-\u249b]/g, (ch) => {
    const n = ch.charCodeAt(0) - 0x2488 + 1;
    return `${n}.`;
  });
  s = s.replace(/\u24ea/g, "(0)");

  s = s.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
  return renumberChoiceOptions(s);
}

/** `\underline{…}` → `<u>…</u>` (중첩 없는 단순 형태) */
export function normalizeUnderlineMarkup(raw: string): string {
  let s = raw;
  for (let n = 0; n < 4; n++) {
    const next = s.replace(/\\underline\{([^{}]*)\}/g, "<u>$1</u>");
    if (next === s) break;
    s = next;
  }
  return s;
}

/** 길이·높이 계산용: 밑줄 태그 제거 */
export function stripUnderlineTags(raw: string): string {
  return raw.replace(/<\/?u>/gi, "");
}

export type UnderlineSegment = { text: string; underline: boolean };

/** `<u>…</u>` 구간을 PDF/화면용 세그먼트로 분리 */
export function splitUnderlineSegments(raw: string): UnderlineSegment[] {
  const parts: UnderlineSegment[] = [];
  const re = /<u>([\s\S]*?)<\/u>/gi;
  let cursor = 0;
  for (const match of raw.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ text: raw.slice(cursor, index), underline: false });
    }
    const inner = match[1] ?? "";
    if (inner) parts.push({ text: inner, underline: true });
    cursor = index + match[0].length;
  }
  if (cursor < raw.length) {
    parts.push({ text: raw.slice(cursor), underline: false });
  }
  return parts.filter((p) => p.text.length > 0);
}

/** 수식 기호를 PDF 텍스트에 읽기 쉽게 풀어 씀 (지문·간단 답용). 밑줄 `<u>` 유지 */
export function latexToReadableText(raw: string): string {
  let s = renumberChoiceOptions(normalizeUnderlineMarkup(raw));

  const held: string[] = [];
  s = s.replace(/<u>([\s\S]*?)<\/u>/gi, (_, inner: string) => {
    const i = held.length;
    held.push(inner);
    return `\uE000${i}\uE001`;
  });

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, " $1 ");
  s = s.replace(/\$([^$\n]+?)\$/g, " $1 ");
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, " $1 ");
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, " $1 ");
  s = s.replace(/\\begin\{[^}]+\}/g, "");
  s = s.replace(/\\end\{[^}]+\}/g, "");
  // 중첩 분수·루트까지 안전하게 풀어 씀 (\frac{\sqrt{5}}{2} → (√(5))/(2))
  s = expandFracSqrtToText(s);
  s = s.replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, "Σ($1→$2)");
  s = s.replace(/\\sum/g, "Σ");
  s = s.replace(/\\angle/g, "∠");
  // 기하 기호는 명령어 이름이 그대로 노출되지 않게 기호로 바꿈
  s = s.replace(/\\overline\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\overrightarrow\{([^{}]+)\}/g, "$1→");
  s = s.replace(/\\parallel/g, "∥");
  s = s.replace(/\\perp/g, "⊥");
  s = s.replace(/\\triangle/g, "△");
  s = s.replace(/\\square/g, "□");
  s = s.replace(/\\equiv/g, "≡");
  s = s.replace(/\\(?:backsim|sim)(?![a-zA-Z])/g, "∽");
  s = s.replace(/\^\{?\\circ\}?/g, "°");
  s = s.replace(/\\circ/g, "°");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\leq/g, "≤");
  s = s.replace(/\\geq/g, "≥");
  s = s.replace(/\\neq/g, "≠");
  s = s.replace(/\\infty/g, "∞");
  s = s.replace(/\\in(?![a-zA-Z])/g, "∈");
  s = s.replace(/\\notin/g, "∉");
  s = s.replace(/\\subseteq/g, "⊆");
  s = s.replace(/\\supseteq/g, "⊇");
  s = s.replace(/\\subset/g, "⊂");
  s = s.replace(/\\supset/g, "⊃");
  s = s.replace(/\\cup/g, "∪");
  s = s.replace(/\\cap/g, "∩");
  s = s.replace(/\\emptyset/g, "∅");
  s = s.replace(/\\therefore/g, "∴");
  s = s.replace(/\\because/g, "∵");
  s = s.replace(/\\cong/g, "≅");
  s = s.replace(/\\approx/g, "≈");
  s = s.replace(/\\pi/g, "π");
  s = s.replace(/\\theta/g, "θ");
  s = s.replace(/\\alpha/g, "α");
  s = s.replace(/\\beta/g, "β");
  s = s.replace(/\\gamma/g, "γ");
  s = s.replace(/\\delta/g, "δ");
  s = s.replace(/\\int/g, "∫");
  s = s.replace(/\\log/g, "log");
  s = s.replace(/\\ln/g, "ln");
  s = s.replace(/\\sin/g, "sin");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tan");
  s = s.replace(/\\quad|\\qquad/g, " ");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\text\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\_/g, "_");
  s = s.replace(/\\\{/g, "{");
  s = s.replace(/\\\}/g, "}");
  s = s.replace(/\\\\/g, "\n");
  s = s.replace(/&/g, " ");
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{2,}/g, " ");

  s = s.replace(/\uE000(\d+)\uE001/g, (_, idx) => {
    const inner = held[Number(idx)] ?? "";
    const cleaned = inner.replace(/[{}]/g, "").trim();
    return cleaned ? `<u>${cleaned}</u>` : "";
  });

  return s.trim();
}

export function parsePacketContent(content?: string): PacketContentPart[] {
  if (!content?.trim()) return [];
  const parts: PacketContentPart[] = [];
  let cursor = 0;
  for (const match of content.matchAll(FIGURE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      const text = latexToReadableText(content.slice(cursor, index));
      if (text) parts.push({ type: "text", text });
    }
    const url = match[1]?.trim() ?? "";
    if (url && isSafeFigureUrl(url)) {
      parts.push({ type: "figure", url });
    } else {
      parts.push({ type: "figureMissing" });
    }
    cursor = index + match[0].length;
  }
  if (cursor < content.length) {
    const text = latexToReadableText(content.slice(cursor));
    if (text) parts.push({ type: "text", text });
  }
  return parts;
}

export function packetPlainLength(content?: string): number {
  return parsePacketContent(content)
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .reduce((n, p) => n + p.text.length, 0);
}
