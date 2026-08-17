"use client";

import { toPng } from "html-to-image";
import katex from "katex";
import type { ReactNode } from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { WrongNotePacketData } from "@/lib/server/admin/wrong-note-packet";
import {
  latexToReadableText,
  parsePacketContent,
  renumberChoiceOptions,
  normalizeMcAnswer,
  normalizeUnderlineMarkup,
  splitUnderlineSegments,
  splitFigureParts,
  extractFigureUrls,
} from "@/lib/utils/packet-content";
import {
  normalizeMathExpression,
  parseMathLikeAnswer,
  splitMixedMathSegments,
  wrapBareMathRuns,
  type MathSegment,
  type QuickAnswerPlan,
} from "@/lib/utils/packet-math";
import {
  flattenAlignedConditions,
  splitMathConditionParts,
} from "@/lib/utils/packet-math-layout";
import { splitPassageAndBody } from "@/lib/utils/packet-passage";
import {
  packByLayoutMode,
  resolveLayoutMode,
  splitExamPassagePieces,
  splitExamQuestionPieces,
  guardPassageHeaderOrphans,
  validatePackedLayout,
  type PacketLayoutMode,
  type PackFitLog,
} from "@/lib/utils/packet-layout";
import {
  DEFAULT_PACKET_LAYOUT_CONFIG,
  mergePacketLayoutConfig,
  resolveMathSolveSpacePt,
  type PacketLayoutConfig,
} from "@/lib/utils/packet-layout-config";
import {
  DEFAULT_PACKET_MATH_SPACING,
  ITEM_GAP_PT,
  PACKET_ANSWER_MATH_CSS,
  PACKET_ITEM_GAP_OPTIONS,
  isTallQuickAnswerMath,
  normalizePacketPdfSettings,
  packetLayoutGapFromSettings,
  triggerPdfBlobDownload,
  type PacketItemGap,
  type PacketMathSpacing,
} from "@/lib/utils/packet-pdf-settings";

const FONT_FAMILY = "PacketKr";
/** 한글 서브셋에 없는 수학 기호(∥ ⊥ ∠ √ ≤ Σ …)를 담당하는 폴백 패밀리 */
const MATH_FONT_FAMILY = "PacketMathSym";
/** NotoSansKR 서브셋에 글리프가 없어 폴백 폰트로 그려야 하는 문자 */
const MATH_FALLBACK_CHARS =
  /[∥‖⊥⟂∠√∛∫∬∑Σ∞≤≥≠≡≈≒∽△▽∈∉⊂⊃∪∩∀∃∴∵πθαβγδλμσφωΩ↔⇔⇒→←↑↓]/;
/** 수학 캡처용 폭(px) — 수식 클리핑 방지용, 시험지형 측정에 쓰지 않음 */
const COL_WIDTH_PX = 360;
/** 수학 캡처 고정 본문 크기 — 문제마다 달라지지 않음 */
const MATH_CAPTURE_FONT_PX = 12;
/** 국어/영어 측정용 — examBodyText 9.5pt ≈ 12.67px */
const EXAM_MEASURE_FONT_PX = 9.5 * (96 / 72);
const EXAM_MEASURE_LINE_HEIGHT = 1.58;
/** DOM 측정 안전 배수 — layoutConfig.page.measureSafety 로 덮어씀 */
const DEFAULT_MEASURE_SAFETY = DEFAULT_PACKET_LAYOUT_CONFIG.page.measureSafety;

/** 수학 캡처 중 가로 클리핑 감지 횟수 (디버그) */
let mathClipFailures = 0;

/** NotoSansKR 서브셋에 ①–⑤가 없어 하위바이트(`abcd)로 깨짐 → 캔버스 글리프 이미지로 대체 */
let circledGlyphDataUrls: Record<string, string> = {};

function isCircledNumberChar(ch: string): boolean {
  if (ch.length !== 1) return false;
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= 0x2460 && cp <= 0x2473;
}

function renderCircledGlyphDataUrl(ch: string): string {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0f172a";
  ctx.font =
    '600 44px "Malgun Gothic","Apple SD Gothic Neo","Segoe UI Symbol","Noto Sans CJK KR","Noto Sans",sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, size / 2, size / 2 + 1);
  return canvas.toDataURL("image/png");
}

function preloadCircledGlyphs(): void {
  const next: Record<string, string> = {};
  for (let i = 1; i <= 20; i++) {
    const ch = String.fromCharCode(0x2460 + i - 1);
    const url = renderCircledGlyphDataUrl(ch);
    if (url) next[ch] = url;
  }
  circledGlyphDataUrls = next;
}

/** A4 콘텐츠 단 높이(pt) — 여백·헤더·푸터 제외 */
const PAGE_COL_HEIGHT = 680;
const COL_WIDTH_PT = 255;
/** PDF 단 폭과 동일한 측정 폭(px) — COL_WIDTH_PX(360)는 수학 캡처 전용 */
const EXAM_MEASURE_WIDTH_PX = Math.floor((COL_WIDTH_PT * 96) / 72);
/** 국어/영어 시험지형 */
const EXAM_LINE_HEIGHT_PT = 13.6;
const EXAM_CHARS_PER_LINE = 28;
const EXAM_META_HEIGHT = 12;
const EXAM_CHUNK_PAD_PT = 8;
/** examQuestionBlock: marginTop 8 + 기본 marginBottom 8 + paddingTop 6 + border 0.6 */
const EXAM_QUESTION_CHROME_PT = 22.6;
/** examSectionLabel 7.5pt + marginBottom 4 */
const EXAM_SECTION_LABEL_PT = 14;
/** 텍스트 조판 문항 그림의 최대 높이(pt) — 단 밖으로 넘치지 않게 */
const EXAM_FIGURE_MAX_HEIGHT_PT = 190;
/** 수학 문제집형 */
const MATH_META_HEIGHT = 16;
const MATH_CARD_CHROME = 18;
const MATH_ITEM_GAP = 8;

export type PacketPdfProgress = {
  label: string;
  percent: number;
};

export type { PacketLayoutConfig } from "@/lib/utils/packet-layout-config";
export { DEFAULT_PACKET_LAYOUT_CONFIG };
export type { PacketItemGap, PacketMathSpacing };
export { PACKET_ITEM_GAP_OPTIONS };

type MathSpacingConfig = {
  hostPaddingPx: number;
  fontSizePx: number;
  lineHeight: number;
  imgMarginPx: number;
  figureMarginPx: number;
  katexDisplayMargin: string;
  cardPaddingPt: number;
  cardGapPt: number;
};

const MATH_SPACING_CONFIG: Record<PacketMathSpacing, MathSpacingConfig> = {
  tight: {
    hostPaddingPx: 4,
    fontSizePx: MATH_CAPTURE_FONT_PX,
    lineHeight: 1.42,
    imgMarginPx: 4,
    figureMarginPx: 3,
    katexDisplayMargin: "0.25em 0",
    cardPaddingPt: 11,
    cardGapPt: 8,
  },
  normal: {
    hostPaddingPx: 5,
    fontSizePx: MATH_CAPTURE_FONT_PX,
    lineHeight: 1.48,
    imgMarginPx: 6,
    figureMarginPx: 4,
    katexDisplayMargin: "0.4em 0",
    cardPaddingPt: 11,
    cardGapPt: 9,
  },
  loose: {
    hostPaddingPx: 7,
    fontSizePx: MATH_CAPTURE_FONT_PX,
    lineHeight: 1.55,
    imgMarginPx: 8,
    figureMarginPx: 6,
    katexDisplayMargin: "0.55em 0",
    cardPaddingPt: 12,
    cardGapPt: 11,
  },
};

/** 수학 본문의 과도한 빈 줄을 여백 설정에 맞게 줄임 */
export function applyMathSpacingToContent(
  content: string,
  spacing: PacketMathSpacing,
): string {
  let s = content.replace(/\r\n/g, "\n").trim();
  // 줄 끝 공백 제거
  s = s.replace(/[ \t]+\n/g, "\n");
  if (spacing === "tight") {
    // 빈 줄 전부 제거하고 한 줄 간격만 유지
    s = s.replace(/\n{2,}/g, "\n");
    s = s.replace(/\\\\\[\s*[\d.]+(?:em|ex|pt|px|mm)?\s*\]/g, "\\\\");
    s = s.replace(/\\vspace\*?\{[^}]*\}/gi, "");
    s = s.replace(/\\bigskip|\\medskip|\\smallskip/gi, "");
  } else if (spacing === "normal") {
    s = s.replace(/\n{4,}/g, "\n\n");
    s = s.replace(/\n{3,}/g, "\n\n");
  }
  // loose: 원문 유지(끝 trim만)
  return s.trim();
}

let fontsReady: Promise<void> | null = null;

function ensurePacketFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      Font.register({
        family: FONT_FAMILY,
        fonts: [
          {
            src: `${origin}/fonts/NotoSansKR-Regular.woff`,
            fontWeight: 400,
          },
          {
            src: `${origin}/fonts/NotoSansKR-Bold.woff`,
            fontWeight: 700,
          },
        ],
      });
      Font.register({
        family: MATH_FONT_FAMILY,
        fonts: [{ src: `${origin}/fonts/NotoSansMath-Regular.woff` }],
      });
      Font.registerHyphenationCallback((word) => [word]);
    })();
    fontsReady = fontsReady.catch((err) => {
      fontsReady = null;
      throw err;
    });
  }
  return fontsReady;
}

type CapturedBody = {
  dataUrl: string;
  width: number;
  height: number;
  /** 캡처 당시 CSS 크기(px) — PDF 배치 크기 계산에 사용 */
  cssWidth?: number;
  cssHeight?: number;
};

/** 빠른정답 캡처 폭·크기 한도 */
const ANSWER_CAPTURE_WIDTH_PX = 300;
const ANSWER_MAX_WIDTH_PT = 400;
const ANSWER_MAX_HEIGHT_PT = 140;
const ANSWER_CAPTURE_PAD_PX = 16;
/** CSS px → PDF pt */
const PX_TO_PT = 0.75;

type QuickAnswerRender =
  | { kind: "status" | "plain"; text: string }
  | { kind: "choice"; marker: string }
  | { kind: "math"; segments: MathSegment[]; fallbackText: string };

/**
 * 빠른정답 셀 렌더링 방식 결정.
 * 상태 문자열 → 객관식 마커 → 수학 표현 → 일반 텍스트 순으로 판단한다.
 */
function resolveQuickAnswer(rawAnswer?: string | null): QuickAnswerRender {
  const source = (rawAnswer ?? "").trim();
  if (!source) return { kind: "status", text: "미등록" };

  const plan: QuickAnswerPlan = parseMathLikeAnswer(source);
  if (plan.kind === "status") return { kind: "status", text: plan.text };

  const marker = normalizeMcAnswer(source);
  if (isCircledNumberChar(marker)) return { kind: "choice", marker };

  if (plan.kind === "math") {
    return {
      kind: "math",
      segments: plan.segments,
      // 캡처 실패 시에도 raw LaTeX가 아니라 읽을 수 있는 텍스트로
      fallbackText: latexToReadableText(source) || source,
    };
  }
  return { kind: "plain", text: plan.text };
}

/** 캡처 이미지를 정답 칸 크기에 맞춘 pt 단위 박스로 */
function answerImageBox(capture: CapturedBody): {
  width: number;
  height: number;
} {
  const cssWidth = capture.cssWidth ?? capture.width;
  const ratio = capture.height / Math.max(1, capture.width);
  let width = Math.min(cssWidth * PX_TO_PT, ANSWER_MAX_WIDTH_PT);
  let height = width * ratio;
  if (height > ANSWER_MAX_HEIGHT_PT) {
    const scale = ANSWER_MAX_HEIGHT_PT / height;
    width *= scale;
    height = ANSWER_MAX_HEIGHT_PT;
  }
  return { width, height };
}

type EnrichedItem = WrongNotePacketData["items"][number] & {
  bodyCapture?: CapturedBody;
  answerCapture?: CapturedBody;
  layoutMode?: PacketLayoutMode;
};

/** 텍스트 조판 경로에서 문항 그림을 실제 이미지로 배치하기 위한 정보 */
type PacketFigure = {
  src: string;
  width: number;
  height: number;
};

/** 수능형 2단용 조각 */
type ColumnChunk = {
  key: string;
  item: EnrichedItem;
  showMeta: boolean;
  continuation: boolean;
  sectionLabel?: "지문" | "문제";
  textContent?: string;
  bodyCapture?: CapturedBody;
  /** 본문에 포함된 문항 그림 — 텍스트 조판(국어/영어) 경로에서 사용 */
  figures?: PacketFigure[];
  fullWidth: boolean;
  height: number;
  chrome: "none" | "exam" | "math";
  layoutMode: PacketLayoutMode;
  /** 수학 풀이 여백(pt) — 렌더·패킹에 포함 */
  solveSpacePt?: number;
};

type PackedPage = {
  left: ColumnChunk[];
  right: ColumnChunk[];
  full: ColumnChunk[];
  layoutMode: PacketLayoutMode;
};

async function waitForImages(root: ParentNode): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
  await new Promise((r) => window.setTimeout(r, 40));
}

const CAPTURE_MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

function escapePacketText(raw: string): string {
  const withMarks = raw.replace(/<u>([\s\S]*?)<\/u>/gi, (_: string, inner: string) => {
    return `\u0001${inner}\u0002`;
  });
  const escaped = withMarks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\u0001/g, "<u>")
    .replace(/\u0002/g, "</u>")
    .replace(/\n/g, "<br/>");
}

function renderKatexHtml(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(normalizeMathExpression(expression), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "html",
    });
  } catch {
    return escapePacketText(latexToReadableText(expression) || expression);
  }
}

/** `$` 없이 남은 \frac · \sqrt 도 KaTeX로. 한글 문장은 그대로. */
function htmlFromPlainSlice(text: string): string {
  if (!/\\[a-zA-Z]+/.test(text)) return escapePacketText(text);
  return splitMixedMathSegments(text)
    .map((seg) =>
      seg.type === "math"
        ? renderKatexHtml(seg.value, false)
        : escapePacketText(seg.value),
    )
    .join("");
}

/** PDF 캡처 전용: React/Tailwind 없이 KaTeX HTML만 생성 */
function buildPacketMathHtml(content: string): string {
  // `$…$` 밖의 기하 기호(AD ∥ BC 등)도 수식으로 감싸 폰트 fallback 깨짐 방지
  const normalized = wrapBareMathRuns(normalizeUnderlineMarkup(content));
  let html = "";
  let cursor = 0;
  for (const match of normalized.matchAll(CAPTURE_MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      html += htmlFromPlainSlice(normalized.slice(cursor, index));
    }
    const expression = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    const displayMode = Boolean(match[1] ?? match[3]);
    html += renderKatexHtml(expression, displayMode);
    cursor = index + match[0].length;
  }
  if (cursor < normalized.length) {
    html += htmlFromPlainSlice(normalized.slice(cursor));
  }
  // KaTeX SVG path에 \n→<br/> 치환하면 d 속성이 깨지므로 전체 replace 금지
  return html;
}

/** 캔버스 오염·CORS 실패를 피하려고 문항 그림을 data URL로 미리 가져온다 */
const figureDataUrlCache = new Map<string, string | null>();

async function toFigureDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  const cached = figureDataUrlCache.get(url);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(url, {
      mode: "cors",
      cache: "force-cache",
      // 그림 한 장 때문에 PDF 생성이 멈추지 않게
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("figure read failed"));
      reader.readAsDataURL(blob);
    });
    figureDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn("[packet-pdf] figure load failed", url, err);
    figureDataUrlCache.set(url, null);
    return null;
  }
}

/** 그림 원본 비율 (없으면 null) */
async function measureImageRatio(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve(img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * 넓은 display 수식만 살짝 축소. scale < 0.88이면 축소하지 않음
 * (내용 잘림보다 가시성 우선 — flattenAlignedConditions가 주 해결책)
 */
function fitWideKatex(mount: HTMLElement, widthPx: number): void {
  mount.querySelectorAll(".katex-display").forEach((el) => {
    const box = el as HTMLElement;
    const katexEl = box.querySelector(".katex") as HTMLElement | null;
    if (!katexEl) return;
    box.style.setProperty("overflow", "visible", "important");
    box.style.setProperty("overflow-x", "visible", "important");
    box.style.setProperty("overflow-y", "visible", "important");
    box.style.height = "";
    box.style.maxHeight = "";
    const avail = Math.max(1, box.clientWidth || widthPx - 8);
    const need = Math.max(katexEl.scrollWidth, katexEl.offsetWidth);
    if (need <= avail + 1) {
      katexEl.style.transform = "";
      return;
    }
    const scale = (avail - 1) / need;
    if (scale < 0.88) {
      // 축소하면 읽기 어려움 → 스케일 생략, flatten에 의존
      katexEl.style.transform = "";
      return;
    }
    katexEl.style.transform = `scale(${scale})`;
    katexEl.style.transformOrigin = "top left";
    katexEl.style.display = "inline-block";
    // transform은 레이아웃 높이에 반영되지 않으므로 축소 높이만 맞춤 (클리핑 없음)
    const naturalH = katexEl.offsetHeight;
    box.style.width = `${Math.ceil(avail)}px`;
    box.style.height = `${Math.max(Math.ceil(naturalH * scale), 1)}px`;
    box.style.maxWidth = "100%";
    box.style.overflow = "visible";
  });
}

async function waitFontsAndPaint(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
  await new Promise<void>((r) =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => r()),
    ),
  );
}

function assertNoHorizontalClip(mount: HTMLElement): boolean {
  let ok = true;
  mount.querySelectorAll(".packet-math-capture, .packet-condition-box").forEach(
    (el) => {
      const node = el as HTMLElement;
      if (node.scrollWidth > node.clientWidth + 1) {
        ok = false;
      }
    },
  );
  // 마운트 자체도 검사
  if (mount.scrollWidth > mount.clientWidth + 1) ok = false;
  return ok;
}

/** 조건 박스: (가)/(나) 줄을 semantic row로 */
function buildConditionBoxHtml(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  const rowHtml = lines
    .map((line) => {
      const m = line.match(
        /^[ \t]*(\([가-힣]\)|（[가-힣]）|[ㄱ-ㅎ][\.．)])[ \t]+([\s\S]+)$/,
      );
      if (m) {
        const label = m[1]!;
        const body = buildPacketMathHtml(m[2]!.trim());
        return `<div class="packet-condition-row"><span class="packet-condition-label">${label}</span><div class="packet-condition-body">${body}</div></div>`;
      }
      return `<div class="packet-condition-body">${buildPacketMathHtml(line)}</div>`;
    })
    .join("");
  return `<div class="packet-condition-box"><div class="packet-condition-heading">조건</div>${rowHtml}</div>`;
}

/** 본문 조각(텍스트/그림) → 캡처용 HTML */
async function buildCaptureBodyHtml(
  content: string,
  spacing: PacketMathSpacing,
): Promise<string> {
  const parts = splitFigureParts(content);
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === "figure") {
      const dataUrl = await toFigureDataUrl(part.url);
      chunks.push(
        dataUrl
          ? `<div class="packet-figure"><img src="${dataUrl}" alt="문항 그림"/></div>`
          : `<div class="packet-figure-missing">문항 그림은 원본 사진에서 확인해 주세요.</div>`,
      );
      continue;
    }
    if (part.type === "figureMissing") {
      chunks.push(
        `<div class="packet-figure-missing">문항 그림은 원본 사진에서 확인해 주세요.</div>`,
      );
      continue;
    }
    const prepared = applyMathSpacingToContent(part.text, spacing);
    if (!prepared) continue;
    // aligned (가)(나) → 줄 단위로 펼쳐 가로 클리핑 방지
    const normalized = renumberChoiceOptions(flattenAlignedConditions(prepared));
    chunks.push(
      splitMathConditionParts(normalized)
        .map((mathPart) =>
          mathPart.kind === "condition"
            ? buildConditionBoxHtml(mathPart.content)
            : `<div>${buildPacketMathHtml(mathPart.content)}</div>`,
        )
        .join(""),
    );
  }
  return chunks.join("");
}

async function captureLatexPng(
  content: string,
  widthPx: number,
  spacing: PacketMathSpacing = "normal",
): Promise<CapturedBody> {
  const cfg = MATH_SPACING_CONFIG[spacing];
  const bodyHtml = await buildCaptureBodyHtml(content, spacing);
  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${widthPx}px`,
    "background:#ffffff",
    "z-index:-1",
    "pointer-events:none",
    "box-sizing:border-box",
    `padding:${cfg.hostPaddingPx}px`,
    // 스크롤바만 숨기고 내용은 잘리지 않게
    "overflow:visible",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = `
    .packet-math-capture {
      font-size: ${cfg.fontSizePx}px;
      line-height: ${cfg.lineHeight};
      color: #0f172a;
      word-break: break-word;
      overflow: visible !important;
      max-width: ${widthPx}px;
      width: ${widthPx - cfg.hostPaddingPx * 2}px;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .packet-math-capture *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
      background: transparent !important;
    }
    .packet-math-capture .katex-display {
      margin: ${cfg.katexDisplayMargin} !important;
      overflow: visible !important;
      max-width: 100% !important;
      text-align: left;
    }
    .packet-math-capture .katex-display > .katex {
      text-align: left;
    }
    .packet-math-capture img {
      max-width: 100% !important;
      height: auto !important;
    }
    .packet-math-capture u {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .packet-condition-box {
      border: 1.5px solid #334155;
      border-radius: 5px;
      padding: ${spacing === "tight" ? 5 : 8}px ${spacing === "tight" ? 6 : 9}px;
      margin: ${spacing === "tight" ? 4 : 8}px 0;
      background: #f8fafc;
      overflow: visible !important;
      max-width: 100%;
    }
    .packet-condition-heading {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .packet-condition-row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 6px;
      margin: 4px 0;
      flex-wrap: wrap;
    }
    .packet-condition-label {
      font-size: ${cfg.fontSizePx}px;
      font-weight: 700;
      color: #0f172a;
      flex: 0 0 auto;
      white-space: nowrap;
    }
    .packet-condition-body {
      flex: 1;
      min-width: 0;
      white-space: normal;
      overflow: visible;
      word-break: break-word;
    }
    .packet-figure {
      margin: ${cfg.figureMarginPx}px 0;
      text-align: center;
    }
    .packet-figure img {
      max-width: 100% !important;
      max-height: 320px;
      height: auto !important;
      object-fit: contain;
    }
    .packet-figure-missing {
      margin: ${cfg.figureMarginPx}px 0;
      font-size: 10px;
      color: #b45309;
    }
  `;
  host.appendChild(style);

  const mount = document.createElement("div");
  mount.className = "packet-math-capture";
  mount.innerHTML = bodyHtml;
  host.appendChild(mount);
  document.body.appendChild(host);

  try {
    await waitForImages(host);
    await waitFontsAndPaint();
    fitWideKatex(mount, widthPx);
    await waitFontsAndPaint();
    fitWideKatex(mount, widthPx);

    if (!assertNoHorizontalClip(mount)) {
      mathClipFailures += 1;
      console.warn(
        "[packet-pdf] math capture horizontal overflow (flatten may be incomplete)",
        { scrollWidth: mount.scrollWidth, clientWidth: mount.clientWidth },
      );
      // overflow 숨기지 않음 — 전체 높이로 캡처
    }

    const rect = mount.getBoundingClientRect();
    const dataUrl = await Promise.race([
      toPng(mount, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: Math.ceil(rect.width) || widthPx,
        height: Math.ceil(rect.height),
        style: {
          overflow: "visible",
          overflowX: "visible",
          overflowY: "visible",
        },
      }),
      new Promise<string>((_, reject) =>
        window.setTimeout(() => reject(new Error("math capture timeout")), 20000),
      ),
    ]);

    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("capture load failed"));
      img.src = dataUrl;
    });
    return { dataUrl, width: img.width, height: img.height };
  } finally {
    host.remove();
  }
}

/**
 * 빠른정답 셀 전용 캡처.
 * 수식 구간은 KaTeX(수학 변수는 기울임), 「또는」 같은 한글은 본문 글꼴로.
 */
async function captureAnswerSegmentsPng(
  segments: MathSegment[],
  widthPx: number,
): Promise<CapturedBody | null> {
  const onlyMath = segments.every((seg) => seg.type === "math");
  const tall = segments.some(
    (seg) => seg.type === "math" && isTallQuickAnswerMath(seg.value),
  );
  const displayMath = onlyMath || tall;

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:8px",
    "top:8px",
    "width:max-content",
    "max-width:" + widthPx + "px",
    "background:#ffffff",
    "z-index:0",
    "opacity:0.01",
    "pointer-events:none",
    "box-sizing:border-box",
    `padding:${ANSWER_CAPTURE_PAD_PX}px ${ANSWER_CAPTURE_PAD_PX}px`,
    "overflow:visible",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = `
    ${PACKET_ANSWER_MATH_CSS}
    .packet-answer-capture {
      font-size: 15px;
      line-height: normal;
      color: #0f172a;
      display: block;
      width: max-content;
      max-width: ${widthPx - ANSWER_CAPTURE_PAD_PX * 2}px;
      overflow: visible !important;
      font-family: "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;
    }
    .packet-answer-capture .katex-display {
      margin: 0;
      text-align: left;
    }
    .packet-answer-capture .katex { font-size: 1.05em; }
    .packet-answer-capture .packet-answer-text { margin: 0 3px; }
  `;
  host.appendChild(style);

  const mount = document.createElement("div");
  mount.className = "packet-answer-capture packet-answer-math";
  const source = segments
    .map((seg) => {
      if (seg.type !== "math") return seg.value;
      return displayMath ? `$$${seg.value}$$` : `$${seg.value}$`;
    })
    .join("");
  mount.innerHTML = buildPacketMathHtml(source);
  host.appendChild(mount);
  document.body.appendChild(host);

  try {
    await waitFontsAndPaint();
    const katexEl = mount.querySelector(".katex") as HTMLElement | null;
    const naturalW = Math.ceil(
      Math.max(
        katexEl?.getBoundingClientRect().width ?? 0,
        mount.scrollWidth,
        host.scrollWidth,
        1,
      ),
    );
    mount.style.width = `${naturalW}px`;
    await waitFontsAndPaint();
    const boxW = Math.max(host.offsetWidth, host.scrollWidth, 1);
    const boxH = Math.max(host.offsetHeight, host.scrollHeight, 1);
    const dataUrl = await toPng(host, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "#ffffff",
    });
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("answer capture load failed"));
      img.src = dataUrl;
    });
    return {
      dataUrl,
      width: img.width,
      height: img.height,
      cssWidth: boxW,
      cssHeight: boxH,
    };
  } finally {
    host.remove();
  }
}

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 9.5,
    color: "#0f172a",
    paddingTop: 34,
    paddingBottom: 30,
    paddingHorizontal: 36,
    lineHeight: 1.5,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    marginTop: 0,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  coverName: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 0,
    color: "#0f172a",
    lineHeight: 1.3,
  },
  coverPage: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 40,
  },
  coverBrand: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
  },
  coverAcademy: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: 700,
    marginTop: 3,
    lineHeight: 1.3,
  },
  coverRule: {
    marginTop: 10,
    marginBottom: 10,
    height: 2,
    backgroundColor: "#0f172a",
    width: "100%",
  },
  coverAccent: {
    width: 28,
    height: 3,
    backgroundColor: "#2563eb",
    marginBottom: 8,
  },
  coverClass: {
    marginTop: 4,
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.3,
  },
  coverMetaBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
  },
  coverMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  coverMetaLabel: {
    width: 48,
    fontSize: 9.5,
    fontWeight: 700,
    color: "#64748b",
  },
  coverMetaValue: {
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 9.5,
    color: "#0f172a",
    lineHeight: 1.35,
  },
  choiceMarkerImage: {
    width: 11,
    height: 11,
    marginTop: 1,
    marginRight: 4,
  },
  answerMarkerImage: {
    width: 12,
    height: 12,
    marginTop: 1,
  },
  coverFooter: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    lineHeight: 1.45,
  },
  metaLabel: {
    width: 52,
    fontWeight: 700,
    color: "#64748b",
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 5,
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 10,
  },
  columnsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  column: {
    width: "48.2%",
  },
  fullWidthCol: {
    width: "100%",
  },
  itemCard: {
    borderWidth: 0.8,
    borderColor: "#94a3b8",
    borderRadius: 2,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 9,
    marginBottom: MATH_ITEM_GAP,
    backgroundColor: "#ffffff",
  },
  itemFull: {
    width: "100%",
    borderWidth: 0.8,
    borderColor: "#94a3b8",
    borderRadius: 2,
    padding: 9,
    marginBottom: MATH_ITEM_GAP,
    backgroundColor: "#ffffff",
  },
  examFlowBlock: {
    marginBottom: 7,
    paddingBottom: 2,
  },
  examQuestionBlock: {
    marginTop: 8,
    marginBottom: 10,
    paddingTop: 6,
    borderTopWidth: 0.6,
    borderTopColor: "#cbd5e1",
  },
  itemMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 5,
    fontSize: 7.5,
  },
  badge: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 5,
    borderRadius: 1,
  },
  contBadge: {
    backgroundColor: "#64748b",
    color: "#ffffff",
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 5,
    borderRadius: 1,
  },
  subject: {
    fontWeight: 700,
    marginRight: 5,
  },
  date: {
    color: "#94a3b8",
  },
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.55,
  },
  examBodyText: {
    fontSize: 9.5,
    lineHeight: 1.58,
  },
  mathBodyText: {
    fontSize: 10,
    lineHeight: 1.48,
  },
  bodyImage: {
    width: "100%",
    marginTop: 3,
  },
  figure: {
    marginTop: 5,
    marginBottom: 3,
    maxHeight: 100,
  },
  figureNote: {
    marginTop: 4,
    fontSize: 8,
    color: "#b45309",
  },
  emptyBody: {
    fontSize: 8,
    color: "#64748b",
  },
  examSectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 4,
  },
  examBogiBox: {
    marginTop: 6,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 8,
    borderWidth: 0.8,
    borderColor: "#94a3b8",
    borderRadius: 2,
    backgroundColor: "#f8fafc",
  },
  examBogiLabel: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  answerHeader: {
    borderTopWidth: 3,
    borderTopColor: "#0f172a",
    paddingTop: 10,
    marginBottom: 8,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
    fontSize: 9,
  },
  answerRowMath: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    fontSize: 9,
  },
  answerNum: {
    width: 28,
    fontWeight: 700,
  },
  answerSubj: {
    width: 70,
    color: "#475569",
  },
  answerVal: {
    flex: 1,
    paddingVertical: 1,
  },
  answerImage: {
    maxHeight: 88,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 26,
    right: 26,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function escapeMeasureHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 실제 DOM으로 시험지형 텍스트 높이(pt) 측정.
 * 문자 수 휴리스틱은 ①–⑤·보기 문항을 과소추정하므로 사용하지 않음.
 * 측정 폭은 PDF 단(COL_WIDTH_PT)과 동일해야 함.
 */
async function measureExamTextHeightPt(
  text: string,
  opts: {
    withMeta?: boolean;
    withSectionLabel?: boolean;
    withQuestionChrome?: boolean;
    choiceGapPx?: number;
    measureSafety?: number;
  } = {},
): Promise<number> {
  const withMeta = Boolean(opts.withMeta);
  const withSectionLabel = Boolean(opts.withSectionLabel);
  const withQuestionChrome = Boolean(opts.withQuestionChrome);
  const choiceGapPx = opts.choiceGapPx ?? DEFAULT_PACKET_LAYOUT_CONFIG.korean.choiceGapPx;
  const measureSafety = opts.measureSafety ?? DEFAULT_MEASURE_SAFETY;

  if (typeof document === "undefined") {
    const lines = Math.max(1, text.split("\n").length);
    return (
      (withMeta ? EXAM_META_HEIGHT : 0) +
      (withSectionLabel ? EXAM_SECTION_LABEL_PT : 0) +
      (withQuestionChrome ? EXAM_QUESTION_CHROME_PT : 0) +
      lines * EXAM_LINE_HEIGHT_PT * 1.2 +
      EXAM_CHUNK_PAD_PT
    ) * measureSafety;
  }

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${EXAM_MEASURE_WIDTH_PX}px`,
    "visibility:hidden",
    "pointer-events:none",
    "z-index:-1",
    "box-sizing:border-box",
  ].join(";");

  const mount = document.createElement("div");
  mount.style.cssText = [
    `width:${EXAM_MEASURE_WIDTH_PX}px`,
    `font-size:${EXAM_MEASURE_FONT_PX}px`,
    `line-height:${EXAM_MEASURE_LINE_HEIGHT}`,
    'font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif',
    "white-space:normal",
    "word-break:break-word",
    "box-sizing:border-box",
  ].join(";");

  const choiceLine = /^([\t ]*)([\u2460-\u2473])[ \t]+(.*)$/;
  const bogiHeader = /^[\t ]*(?:<보기>|＜보기＞|【보기】)\s*$/;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];
  let inBogi = false;
  let bogiBuf: string[] = [];

  const flushBogi = () => {
    if (!inBogi) return;
    const inner = bogiBuf.join("<br/>") || "&nbsp;";
    htmlParts.push(
      `<div style="display:block;margin:6px 0 8px;padding:6px 8px;border:0.8px solid #94a3b8;border-radius:2px;background:#f8fafc;box-sizing:border-box">${inner}</div>`,
    );
    inBogi = false;
    bogiBuf = [];
  };

  for (const line of lines) {
    if (bogiHeader.test(line) || (!inBogi && /<보기>|＜보기＞|【보기】/.test(line) && !choiceLine.test(line))) {
      flushBogi();
      inBogi = true;
      bogiBuf = [
        `<div style="font-weight:700;margin-bottom:4px">${escapeMeasureHtml(line.trim() || "<보기>")}</div>`,
      ];
      // 발문 한 줄에 <보기>만 있는 경우 / 발문+보기 혼재 시 본문은 박스 밖일 수 있음
      if (!bogiHeader.test(line) && line.replace(/<보기>|＜보기＞|【보기】/g, "").trim()) {
        // 발문에 인라인 <보기> 언급만 있으면 박스로 열지 않음
        inBogi = false;
        bogiBuf = [];
        htmlParts.push(`<div style="display:block">${escapeMeasureHtml(line)}</div>`);
      }
      continue;
    }
    if (inBogi) {
      if (choiceLine.test(line)) {
        flushBogi();
        // fall through to choice rendering below
      } else if (!line.trim()) {
        bogiBuf.push(`<div style="height:${EXAM_MEASURE_FONT_PX * 0.35}px"></div>`);
        continue;
      } else {
        bogiBuf.push(escapeMeasureHtml(line));
        continue;
      }
    }
    if (!line.trim()) {
      htmlParts.push(
        `<div style="height:${EXAM_MEASURE_FONT_PX * 0.45}px"></div>`,
      );
      continue;
    }
    const cm = line.match(choiceLine);
    if (cm) {
      const marker = escapeMeasureHtml(cm[2]!);
      const body = escapeMeasureHtml(cm[3] ?? "");
      htmlParts.push(
        `<div style="display:flex;align-items:flex-start;margin-bottom:${choiceGapPx}px;padding-right:2px;box-sizing:border-box">` +
          `<span style="width:14px;flex:0 0 14px;font-weight:700;margin-right:4px;line-height:${EXAM_MEASURE_LINE_HEIGHT}">${marker}</span>` +
          `<span style="flex:1 1 0;min-width:0;line-height:${EXAM_MEASURE_LINE_HEIGHT}">${body}</span>` +
          `</div>`,
      );
      continue;
    }
    htmlParts.push(`<div style="display:block">${escapeMeasureHtml(line)}</div>`);
  }
  flushBogi();
  mount.innerHTML = htmlParts.join("");

  host.appendChild(mount);
  document.body.appendChild(host);

  try {
    await waitFontsAndPaint();
    const hPx = mount.getBoundingClientRect().height;
    const hPt = hPx * (72 / 96);
    const chrome =
      (withMeta ? EXAM_META_HEIGHT : 0) +
      (withSectionLabel ? EXAM_SECTION_LABEL_PT : 0) +
      (withQuestionChrome ? EXAM_QUESTION_CHROME_PT : EXAM_CHUNK_PAD_PT);
    return Math.max(16, (chrome + hPt) * measureSafety);
  } finally {
    host.remove();
  }
}

function estimateCaptureHeight(capture: CapturedBody): number {
  const h = (capture.height / Math.max(1, capture.width)) * COL_WIDTH_PT;
  return (MATH_META_HEIGHT + MATH_CARD_CHROME + h) * 1.08;
}

function estimateMathBlockHeight(
  capture: CapturedBody,
  solveSpacePt: number,
  blockGapPt: number,
): number {
  return estimateCaptureHeight(capture) + solveSpacePt + blockGapPt * 0.5;
}

async function itemToUnits(
  item: EnrichedItem,
  colHeight: number,
  layoutConfig: PacketLayoutConfig,
  itemGap: PacketItemGap,
): Promise<ColumnChunk[]> {
  const mode = item.layoutMode ?? resolveLayoutMode(item);
  const measureOpts = {
    choiceGapPx: layoutConfig.korean.choiceGapPx,
    measureSafety: layoutConfig.page.measureSafety,
  };

  if (item.bodyCapture && mode === "math") {
    const solveSpacePt = resolveMathSolveSpacePt(layoutConfig);
    const blockGapPt =
      ITEM_GAP_PT[itemGap] ?? layoutConfig.math.blockGapPt;
    const height = estimateMathBlockHeight(
      item.bodyCapture,
      solveSpacePt,
      blockGapPt,
    );
    return [
      {
        key: `${item.id}-cap`,
        item,
        showMeta: true,
        continuation: false,
        bodyCapture: item.bodyCapture,
        fullWidth: height > colHeight + 0.5,
        height: Math.max(height, 40),
        chrome: "math",
        layoutMode: "math",
        solveSpacePt,
      },
    ];
  }

  const { passage, body } = splitPassageAndBody(
    item.problemLatex,
    item.sharedPassage,
  );

  const toPlain = (raw: string) =>
    latexToReadableText(
      parsePacketContent(raw)
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n\n"),
    ) || raw;

  const units: ColumnChunk[] = [];

  /** 그림은 문항 블록에 붙여 원문 손실 없이 함께 이동시킨다 */
  const buildFigures = async (raw: string): Promise<PacketFigure[]> => {
    const urls = extractFigureUrls(raw);
    const figures: PacketFigure[] = [];
    for (const url of urls) {
      const src = (await toFigureDataUrl(url)) ?? url;
      const ratio = (await measureImageRatio(src)) ?? 0.7;
      const width = COL_WIDTH_PT - 12;
      const height = Math.min(width * ratio, EXAM_FIGURE_MAX_HEIGHT_PT);
      figures.push({ src, width: height / ratio, height });
    }
    return figures;
  };

  const attachFigures = (figures: PacketFigure[]) => {
    if (figures.length === 0 || units.length === 0) return;
    const last = units[units.length - 1]!;
    last.figures = [...(last.figures ?? []), ...figures];
    last.height +=
      figures.reduce((sum, fig) => sum + fig.height + 6, 0) + 2;
  };

  if (passage) {
    const plain = toPlain(passage);
    const usable = colHeight - EXAM_META_HEIGHT;
    const linesFit = Math.max(10, Math.floor(usable / EXAM_LINE_HEIGHT_PT));
    const maxChars = Math.max(
      140,
      Math.min(
        layoutConfig.korean.passageChunkMaxChars,
        Math.floor(linesFit * EXAM_CHARS_PER_LINE * 0.55),
      ),
    );
    const pieces = guardPassageHeaderOrphans(
      splitExamPassagePieces(plain, maxChars),
      layoutConfig.korean.minLinesAfterHeader,
    );
    for (let index = 0; index < pieces.length; index++) {
      const part = pieces[index]!;
      const height = await measureExamTextHeightPt(part, {
        withMeta: index === 0,
        withSectionLabel: index === 0,
        ...measureOpts,
      });
      units.push({
        key: `${item.id}-p${index}`,
        item,
        showMeta: index === 0,
        continuation: index > 0,
        sectionLabel: index === 0 ? "지문" : undefined,
        textContent: part,
        fullWidth: false,
        height,
        chrome: "none",
        layoutMode: "exam",
      });
    }
    attachFigures(await buildFigures(passage));
  }

  const questionRaw = (
    body || (!passage ? item.problemLatex : "") || ""
  ).trim();
  if (questionRaw) {
    const plain = toPlain(questionRaw);
    const qPieces = splitExamQuestionPieces(plain);
    let qIndex = 0;
    for (let qi = 0; qi < qPieces.length; qi++) {
      const qText = qPieces[qi]!;
      const isFirstQ = qIndex === 0;
      const showMeta = !passage && isFirstQ;
      const showSection = Boolean(passage) && isFirstQ;
      const h = await measureExamTextHeightPt(qText, {
        withMeta: showMeta,
        withSectionLabel: showSection,
        withQuestionChrome: true,
        ...measureOpts,
      });
      units.push({
        key: `${item.id}-q${qIndex}`,
        item,
        showMeta,
        continuation: Boolean(passage) || qIndex > 0,
        sectionLabel: showSection ? "문제" : undefined,
        textContent: qText,
        fullWidth: h > colHeight + 0.5,
        height: Math.max(h, 28),
        chrome: "exam",
        layoutMode: mode === "math" ? "exam" : mode,
      });
      qIndex += 1;
    }
    attachFigures(await buildFigures(questionRaw));
  }

  if (units.length === 0) {
    units.push({
      key: `${item.id}-empty`,
      item,
      showMeta: true,
      continuation: false,
      textContent: "",
      fullWidth: false,
      height: 40,
      chrome: "exam",
      layoutMode: mode,
    });
  }

  return units;
}

async function packProblemPages(
  items: EnrichedItem[],
  layoutConfig: PacketLayoutConfig,
  itemGap: PacketItemGap,
): Promise<{ pages: PackedPage[]; fitLogs: PackFitLog[] }> {
  const colHeight = PAGE_COL_HEIGHT;
  const allUnits: ColumnChunk[] = [];
  for (const item of items) {
    allUnits.push(...(await itemToUnits(item, colHeight, layoutConfig, itemGap)));
  }

  const fitLogs: PackFitLog[] = [];
  const packed = packByLayoutMode(
    allUnits.map((u) => ({
      key: u.key,
      itemId: u.item.id,
      mode: u.layoutMode,
      splittable: u.chrome === "none",
      chrome: u.chrome,
      sectionLabel: u.sectionLabel,
      showMeta: u.showMeta,
      continuation: u.continuation,
      textContent: u.textContent,
      bodyCapture: u.bodyCapture,
      height: u.height,
    })),
    colHeight,
    layoutConfig,
    fitLogs,
  );

  const validation = validatePackedLayout(
    packed,
    fitLogs,
    colHeight,
    layoutConfig.korean.minLinesAfterHeader,
  );
  const mathWithoutSolveSpace = allUnits.filter(
    (unit) => unit.chrome === "math" && (unit.solveSpacePt ?? 0) <= 0,
  ).length;
  const invalidCount =
    validation.emptyPages +
    validation.overflowingColumns +
    validation.duplicatedAtomicUnits +
    validation.orphanSectionHeaders +
    validation.unjustifiedMoves +
    mathWithoutSolveSpace;

  console.log(
    `[packet-pdf][layout-validation] ${JSON.stringify({
      overlap: validation.overflowingColumns,
      clipping: mathClipFailures,
      emptyPages: validation.emptyPages,
      anySplitMathQuestion: validation.duplicatedAtomicUnits,
      allMathQuestionHaveSolveSpace: mathWithoutSolveSpace === 0,
      orphanSectionHeader: validation.orphanSectionHeaders,
      questionPlacedWhenFit: validation.unjustifiedMoves === 0,
    })}`,
  );
  if (invalidCount > 0) {
    throw new Error(
      `PDF layout validation failed: ${JSON.stringify({
        ...validation,
        mathWithoutSolveSpace,
      })}`,
    );
  }

  const byKey = new Map(allUnits.map((u) => [u.key, u]));

  const pages = packed.map((page) => {
    const left = page.left
      .map((u) => byKey.get(u.key))
      .filter((x): x is ColumnChunk => Boolean(x));
    const right = page.right
      .map((u) => byKey.get(u.key))
      .filter((x): x is ColumnChunk => Boolean(x));

    // 단 초과 단독 유닛 → 전폭 페이지 (wrap 허용, 옆 단 겹침 방지)
    const soloOversize =
      right.length === 0 &&
      left.length === 1 &&
      left[0]!.height > colHeight + 0.5;

    if (soloOversize) {
      return {
        left: [] as ColumnChunk[],
        right: [] as ColumnChunk[],
        full: left.map((c) => ({ ...c, fullWidth: true })),
        layoutMode: page.mode,
      };
    }

    return {
      left,
      right,
      full: [] as ColumnChunk[],
      layoutMode: page.mode,
    };
  });

  // 빈 페이지 제거 (overflow continuation / 빈 pack 방지)
  const nonEmpty = pages.filter(
    (p) => p.left.length > 0 || p.right.length > 0 || p.full.length > 0,
  );

  return { pages: nonEmpty.length > 0 ? nonEmpty : pages, fitLogs };
}

type PdfTextStyle =
  | typeof styles.bodyText
  | typeof styles.examBodyText
  | typeof styles.mathBodyText;

function PdfRichText({
  text,
  style,
}: {
  text: string;
  style: PdfTextStyle;
}) {
  const lines = text.split("\n");
  const choiceLine = /^([\t ]*)([\u2460-\u2473])[ \t]+(.*)$/;
  const bogiHeader = /^[\t ]*(?:<보기>|＜보기＞|【보기】)\s*$/;

  const hasChoices = lines.some((l) => choiceLine.test(l));
  const hasBogi = lines.some(
    (l) => bogiHeader.test(l) || /^[\t ]*(?:<보기>|＜보기＞|【보기】)/.test(l),
  );
  if (hasChoices || hasBogi) {
    const nodes: ReactNode[] = [];
    let bogiLines: string[] | null = null;

    const flushBogi = (key: string) => {
      if (!bogiLines) return;
      const [label, ...rest] = bogiLines;
      nodes.push(
        <View key={key} style={styles.examBogiBox} wrap={false}>
          <Text style={[style, styles.examBogiLabel]}>
            {label?.trim() || "<보기>"}
          </Text>
          {rest.map((bl, bi) =>
            bl.trim() ? (
              <PdfRichTextInline
                key={`bogi-${key}-${bi}`}
                text={bl}
                style={style}
              />
            ) : (
              <View key={`bogi-e-${key}-${bi}`} style={{ height: 4 }} />
            ),
          )}
        </View>,
      );
      bogiLines = null;
    };

    lines.forEach((line, idx) => {
      if (bogiHeader.test(line)) {
        flushBogi(`bf-${idx}`);
        bogiLines = [line.trim() || "<보기>"];
        return;
      }
      if (bogiLines) {
        if (choiceLine.test(line)) {
          flushBogi(`bf-${idx}`);
        } else {
          bogiLines.push(line);
          return;
        }
      }

      const m = line.match(choiceLine);
      if (m) {
        const marker = m[2]!;
        const glyph = circledGlyphDataUrls[marker];
        nodes.push(
          <View
            key={`c-${idx}`}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 3,
              paddingRight: 2,
            }}
          >
            {glyph ? (
              <Image src={glyph} style={styles.choiceMarkerImage} />
            ) : (
              <Text
                style={[
                  style,
                  { width: 14, fontWeight: 700, marginRight: 4 },
                ]}
              >
                {marker}
              </Text>
            )}
            <Text
              style={[
                style,
                {
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: 0,
                  paddingLeft: 0,
                },
              ]}
            >
              <MathAwareText text={m[3] ?? ""} keyPrefix={`c${idx}`} />
            </Text>
          </View>,
        );
        return;
      }
      if (!line.trim()) {
        nodes.push(<View key={`e-${idx}`} style={{ height: 4 }} />);
        return;
      }
      nodes.push(
        <PdfRichTextInline key={`t-${idx}`} text={line} style={style} />,
      );
    });
    flushBogi("bf-end");

    return <View>{nodes}</View>;
  }

  const segments = splitUnderlineSegments(text);
  if (segments.length === 0) {
    return <Text style={style} />;
  }
  if (segments.length === 1 && !segments[0]!.underline) {
    return (
      <Text style={style}>
        <MathAwareText text={segments[0]!.text} keyPrefix="s0" />
      </Text>
    );
  }
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.underline ? (
          <Text key={`u-${i}`} style={{ textDecoration: "underline" }}>
            <MathAwareText text={seg.text} keyPrefix={`u${i}`} />
          </Text>
        ) : (
          <Text key={`t-${i}`}>
            <MathAwareText text={seg.text} keyPrefix={`t${i}`} />
          </Text>
        ),
      )}
    </Text>
  );
}

/**
 * 한글 폰트에 글리프가 없는 수학 기호만 폴백 폰트로 그린다.
 * (기호가 없으면 원문 그대로 하나의 Text)
 */
function MathAwareText({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  if (!MATH_FALLBACK_CHARS.test(text)) return <>{text}</>;
  const runs: { text: string; math: boolean }[] = [];
  for (const ch of text) {
    const math = MATH_FALLBACK_CHARS.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.math === math) last.text += ch;
    else runs.push({ text: ch, math });
  }
  return (
    <>
      {runs.map((run, i) =>
        run.math ? (
          <Text
            key={`${keyPrefix}-m-${i}`}
            style={{ fontFamily: MATH_FONT_FAMILY }}
          >
            {run.text}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-t-${i}`}>{run.text}</Text>
        ),
      )}
    </>
  );
}

function PdfRichTextInline({
  text,
  style,
}: {
  text: string;
  style: PdfTextStyle;
}) {
  const segments = splitUnderlineSegments(text);
  if (segments.length <= 1 && !segments[0]?.underline) {
    const value = segments[0]?.text ?? text;
    return (
      <Text style={style}>
        <MathAwareText text={value} keyPrefix="i0" />
      </Text>
    );
  }
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.underline ? (
          <Text key={`iu-${i}`} style={{ textDecoration: "underline" }}>
            <MathAwareText text={seg.text} keyPrefix={`iu${i}`} />
          </Text>
        ) : (
          <Text key={`it-${i}`}>
            <MathAwareText text={seg.text} keyPrefix={`it${i}`} />
          </Text>
        ),
      )}
    </Text>
  );
}

function ChunkCard({
  chunk,
  mathSpacing = "normal",
  itemGap = "normal",
  layoutConfig = DEFAULT_PACKET_LAYOUT_CONFIG,
}: {
  chunk: ColumnChunk;
  mathSpacing?: PacketMathSpacing;
  itemGap?: PacketItemGap;
  layoutConfig?: PacketLayoutConfig;
}) {
  const { item } = chunk;
  const cfg = MATH_SPACING_CONFIG[mathSpacing];
  const gapPt = ITEM_GAP_PT[itemGap];
  const textStyle =
    chunk.layoutMode === "exam" ? styles.examBodyText : styles.mathBodyText;

  const cardStyle =
    chunk.chrome === "math"
      ? {
          ...styles.itemCard,
          marginBottom: gapPt,
          padding: cfg.cardPaddingPt,
        }
      : chunk.chrome === "exam"
        ? {
            ...styles.examQuestionBlock,
            marginBottom: layoutConfig.korean.questionGapPt,
          }
        : {
            ...styles.examFlowBlock,
            marginBottom: layoutConfig.korean.passageBlockGapPt,
          };

  return (
    <View
      style={cardStyle}
      // 지문·전폭 장문만 페이지 넘어감. 일반 문제는 atomic.
      wrap={chunk.chrome === "none" || chunk.fullWidth}
    >
      {chunk.showMeta ? (
        <View style={styles.itemMeta}>
          <Text style={styles.badge}>{item.number}</Text>
          <Text style={styles.subject}>{item.subjectName}</Text>
          <Text style={styles.date}>{item.createdDateLabel}</Text>
        </View>
      ) : null}
      {chunk.sectionLabel && chunk.chrome !== "none" ? (
        <Text style={styles.examSectionLabel}>{chunk.sectionLabel}</Text>
      ) : null}
      {chunk.sectionLabel === "지문" &&
      chunk.chrome === "none" &&
      chunk.showMeta ? (
        <Text style={styles.examSectionLabel}>지문</Text>
      ) : null}
      {chunk.bodyCapture ? (
        <>
          <Image src={chunk.bodyCapture.dataUrl} style={styles.bodyImage} />
          {(chunk.solveSpacePt ?? 0) > 0 ? (
            <View
              style={{
                height: chunk.solveSpacePt,
                minHeight: chunk.solveSpacePt,
                marginTop: 4,
                borderTopWidth: 0.5,
                borderTopColor: "#e2e8f0",
              }}
            />
          ) : null}
        </>
      ) : chunk.textContent !== undefined ? (
        chunk.textContent ? (
          <PdfRichText text={chunk.textContent} style={textStyle} />
        ) : chunk.figures?.length ? null : (
          <Text style={styles.emptyBody}>정리된 문제 본문이 없어요.</Text>
        )
      ) : (
        <TextBody content={item.problemLatex} />
      )}
      {chunk.figures?.map((figure, index) => (
        <Image
          key={`fig-${chunk.key}-${index}`}
          src={figure.src}
          style={{
            width: figure.width,
            height: figure.height,
            marginTop: 6,
            alignSelf: "center",
          }}
        />
      ))}
    </View>
  );
}


function TextBody({ content }: { content?: string }) {
  const parts = parsePacketContent(content);
  if (parts.length === 0) {
    return <Text style={styles.emptyBody}>정리된 문제 본문이 없어요.</Text>;
  }
  return (
    <View>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <PdfRichText
              key={`t-${i}`}
              text={part.text}
              style={styles.bodyText}
            />
          );
        }
        if (part.type === "figure") {
          return <Image key={`f-${i}`} src={part.url} style={styles.figure} />;
        }
        return (
          <Text key={`m-${i}`} style={styles.figureNote}>
            (그림을 불러오지 못함)
          </Text>
        );
      })}
    </View>
  );
}

function WrongNotePacketPdfDoc({
  data,
  items,
  problemPages,
  mathSpacing = "normal",
  itemGap = "normal",
  layoutConfig = DEFAULT_PACKET_LAYOUT_CONFIG,
}: {
  data: WrongNotePacketData;
  items: EnrichedItem[];
  problemPages: PackedPage[];
  mathSpacing?: PacketMathSpacing;
  itemGap?: PacketItemGap;
  layoutConfig?: PacketLayoutConfig;
}) {
  return (
    <Document
      title={`${data.studentName} 오답 모음`}
      author="Re:mind"
      subject="오답 모음"
    >
      <Page size="A4" style={[styles.page, styles.coverPage]}>
        <Text style={styles.coverBrand}>Re:mind</Text>
        <Text style={styles.coverAcademy}>{data.academyName}</Text>
        <View style={styles.coverRule} />

        <View style={styles.coverAccent} />
        <Text style={styles.coverTitle}>오답 모음</Text>
        <Text style={styles.coverName}>{data.studentName} 학생</Text>
        {data.classLabel ? (
          <Text style={styles.coverClass}>{data.classLabel}</Text>
        ) : null}

        <View style={styles.coverMetaBox}>
          {(
            [
              [
                "기간",
                `${data.periodLabel} (${data.periodStart} ~ ${data.periodEnd})`,
              ],
              ["과목", data.subjectFilterLabel],
              ["단계", data.phaseFilterLabel],
              ["상태", data.statusFilterLabel],
              [
                "문항",
                `${data.items.length}개${data.truncated ? " (최대 80개)" : ""}`,
              ],
              ["작성일", data.generatedAtLabel],
            ] as const
          ).map(([label, value], idx) => (
            <View
              key={label}
              style={
                idx === 0
                  ? [styles.coverMetaRow, { marginTop: 0 }]
                  : styles.coverMetaRow
              }
            >
              <Text style={styles.coverMetaLabel}>{label}</Text>
              <Text style={styles.coverMetaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.coverFooter}>
          A4 세로 · 수능형 2단 · 원본 사진 제외 · 학습용 인쇄물
        </Text>
      </Page>

      {problemPages.map((packed, pageIdx) => (
        <Page
          key={`prob-${pageIdx}`}
          size="A4"
          style={styles.page}
        >
          {packed.full.length > 0 ? (
            <View style={styles.fullWidthCol}>
              {packed.full.map((chunk) => (
                <ChunkCard
                  key={chunk.key}
                  chunk={chunk}
                  mathSpacing={mathSpacing}
                  itemGap={itemGap}
                  layoutConfig={layoutConfig}
                />
              ))}
            </View>
          ) : null}

          {(packed.left.length > 0 || packed.right.length > 0) && (
            <View style={styles.columnsRow}>
              <View style={styles.column}>
                {packed.left.map((chunk) => (
                  <ChunkCard
                    key={chunk.key}
                    chunk={chunk}
                    mathSpacing={mathSpacing}
                    itemGap={itemGap}
                    layoutConfig={layoutConfig}
                  />
                ))}
              </View>
              <View style={styles.column}>
                {packed.right.map((chunk) => (
                  <ChunkCard
                    key={chunk.key}
                    chunk={chunk}
                    mathSpacing={mathSpacing}
                    itemGap={itemGap}
                    layoutConfig={layoutConfig}
                  />
                ))}
              </View>
            </View>
          )}

          <Text style={styles.footer} fixed>
            {pageIdx + 2} / {1 + problemPages.length + 1}
          </Text>
        </Page>
      ))}

      <Page size="A4" style={styles.page}>
        <View style={styles.answerHeader}>
          <Text style={styles.sectionTitle}>빠른정답</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: "#cbd5e1",
            paddingBottom: 4,
            marginBottom: 2,
            fontWeight: 700,
            fontSize: 8,
          }}
        >
          <Text style={styles.answerNum}>번호</Text>
          <Text style={styles.answerSubj}>과목</Text>
          <Text style={styles.answerVal}>정답</Text>
        </View>
        {items.map((item) => {
          const plan = resolveQuickAnswer(item.answerText);
          const glyph =
            plan.kind === "choice" ? circledGlyphDataUrls[plan.marker] : undefined;
          const box = item.answerCapture
            ? answerImageBox(item.answerCapture)
            : null;
          return (
            <View
              key={`ans-${item.id}`}
              style={plan.kind === "math" ? styles.answerRowMath : styles.answerRow}
              wrap={false}
            >
              <Text style={styles.answerNum}>{item.number}</Text>
              <Text style={styles.answerSubj}>{item.subjectName}</Text>
              <View style={styles.answerVal}>
                {plan.kind === "math" && item.answerCapture && box ? (
                  <Image
                    src={item.answerCapture.dataUrl}
                    style={{ width: box.width, height: box.height }}
                  />
                ) : plan.kind === "choice" ? (
                  glyph ? (
                    <Image src={glyph} style={styles.answerMarkerImage} />
                  ) : (
                    <Text>{plan.marker}</Text>
                  )
                ) : (
                  <Text>
                    <MathAwareText
                      text={plan.kind === "math" ? plan.fallbackText : plan.text}
                      keyPrefix={`ans-${item.id}`}
                    />
                  </Text>
                )}
              </View>
            </View>
          );
        })}
        <Text style={styles.footer} fixed>
          {1 + problemPages.length + 1} / {1 + problemPages.length + 1}
        </Text>
      </Page>
    </Document>
  );
}

function report(
  onProgress: ((p: PacketPdfProgress) => void) | undefined,
  label: string,
  percent: number,
) {
  onProgress?.({ label, percent: Math.max(0, Math.min(100, Math.round(percent))) });
}

/** MediaBox를 안전하게 A4로 맞춤 (문자열 치환 금지 — xref가 깨짐) */
async function ensureA4Pages(blob: Blob): Promise<Blob> {
  try {
    const { PDFDocument, PageSizes } = await import("pdf-lib");
    const bytes = await blob.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    for (const page of doc.getPages()) {
      page.setSize(PageSizes.A4[0], PageSizes.A4[1]);
    }
    const out = await doc.save();
    return new Blob([new Uint8Array(out)], { type: "application/pdf" });
  } catch (err) {
    console.warn("[packet-pdf] ensureA4Pages failed", err);
    return blob;
  }
}

/** 지문은 텍스트, 수학은 KaTeX 캡처로 PDF Blob 생성 */
export async function buildWrongNotePacketPdfBlob(
  data: WrongNotePacketData,
  onProgress?: (p: PacketPdfProgress) => void,
  settingsOrSpacing?: unknown,
  itemGapArg?: PacketItemGap,
  _legacySolveSpace?: unknown,
  layoutConfigInput?: Partial<PacketLayoutConfig>,
): Promise<Blob> {
  const fromObject =
    settingsOrSpacing != null &&
    typeof settingsOrSpacing === "object" &&
    !Array.isArray(settingsOrSpacing);
  const settings = normalizePacketPdfSettings(
    fromObject
      ? {
          ...(settingsOrSpacing as Record<string, unknown>),
          itemGap:
            (settingsOrSpacing as { itemGap?: unknown }).itemGap ?? itemGapArg,
        }
      : { itemGap: itemGapArg },
  );
  const layoutPartial = fromObject
    ? ((settingsOrSpacing as { layoutConfig?: Partial<PacketLayoutConfig> })
        .layoutConfig ?? layoutConfigInput)
    : layoutConfigInput;
  const gap = packetLayoutGapFromSettings(settings);
  const mathSpacing = settings.mathSpacing || DEFAULT_PACKET_MATH_SPACING;
  const itemGap = settings.itemGap;

  report(onProgress, "한글 폰트 준비 중…", 2);
  await ensurePacketFonts();
  preloadCircledGlyphs();
  mathClipFailures = 0;

  const layoutConfig = mergePacketLayoutConfig({
    ...layoutPartial,
    math: {
      ...layoutPartial?.math,
      solveSpace: "normal",
      blockGapPt: layoutPartial?.math?.blockGapPt ?? gap.math.blockGapPt,
    },
    korean: {
      ...layoutPartial?.korean,
      questionGapPt:
        layoutPartial?.korean?.questionGapPt ?? gap.korean.questionGapPt,
    },
  });

  const total = Math.max(1, data.items.length);
  const enriched: EnrichedItem[] = [];
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const mode = resolveLayoutMode(item);
    const next: EnrichedItem = { ...item, layoutMode: mode };
    const base = 5 + (i / total) * 75;

    report(
      onProgress,
      `문항 준비 중… ${i + 1}/${data.items.length}`,
      base,
    );

    // 수학만 KaTeX 캡처 — 국어/영어는 시험지형 텍스트 조판
    if (mode === "math" && item.problemLatex) {
      report(
        onProgress,
        `수식 렌더 중… ${i + 1}/${data.items.length}`,
        base + 2,
      );
      try {
        next.bodyCapture = await captureLatexPng(
          item.problemLatex,
          COL_WIDTH_PX,
          mathSpacing,
        );
      } catch (err) {
        console.warn("[packet-pdf] math capture failed", item.id, err);
      }
    }

    const answerPlan = resolveQuickAnswer(item.answerText);
    if (answerPlan.kind === "math") {
      try {
        const captured = await captureAnswerSegmentsPng(
          answerPlan.segments,
          ANSWER_CAPTURE_WIDTH_PX,
        );
        if (captured) {
          next.answerCapture = captured;
          const box = answerImageBox(captured);
          console.log(
            `[packet-pdf][answer] ${item.id} css=${captured.cssWidth}x${captured.cssHeight} png=${captured.width}x${captured.height} box=${Math.round(box.width)}x${Math.round(box.height)}`,
          );
        }
      } catch (err) {
        console.warn("[packet-pdf] answer capture failed", item.id, err);
      }
    }

    enriched.push(next);
  }

  report(onProgress, "과목별 2단 조판 중…", 85);
  const { pages: problemPages, fitLogs } = await packProblemPages(
    enriched,
    layoutConfig,
    itemGap,
  );

  if (problemPages.some((p) => p.left.length + p.right.length + p.full.length === 0)) {
    console.warn("[packet-pdf] sanity: empty problem page slipped through");
  }
  if (mathClipFailures > 0) {
    console.warn(`[packet-pdf] math clipFailures=${mathClipFailures}`);
  }
  if (typeof console !== "undefined" && fitLogs.length > 0) {
    const moved = fitLogs.filter((l) => l.movedBecauseDoesNotFit);
    console.log(
      `[packet-pdf][fit] placed=${fitLogs.length - moved.length} moved=${moved.length}`,
    );
    console.log(
      `[packet-pdf][fit-moves] ${JSON.stringify(
        moved.map((log) => ({
          unitKey: log.unitKey,
          remaining: Math.round((log.colHeight - log.usedBefore) * 10) / 10,
          nextHeight: Math.round(log.height * 10) / 10,
          reason: log.reason,
        })),
      )}`,
    );
  }

  report(onProgress, "PDF 파일 만드는 중…", 92);
  let rawBlob: Blob;
  try {
    rawBlob = await pdf(
      <WrongNotePacketPdfDoc
        data={data}
        items={enriched}
        problemPages={problemPages}
        mathSpacing={mathSpacing}
        itemGap={itemGap}
        layoutConfig={layoutConfig}
      />,
    ).toBlob();
  } catch (err) {
    console.error("[packet-pdf] toBlob failed", err);
    throw err;
  }
  const blob = await ensureA4Pages(rawBlob);
  report(onProgress, "다운로드 준비 완료", 100);
  return blob;
}

/** 지문은 텍스트, 수학은 KaTeX 캡처로 PDF 다운로드 */
export async function downloadWrongNotePacketTextPdf(
  data: WrongNotePacketData,
  fileName: string,
  onProgress?: (p: PacketPdfProgress) => void,
  settingsInput?: unknown,
  legacyItemGap?: PacketItemGap,
): Promise<void> {
  const blob = await buildWrongNotePacketPdfBlob(
    data,
    onProgress,
    settingsInput,
    legacyItemGap,
  );
  try {
    triggerPdfBlobDownload(blob, fileName);
  } catch (err) {
    console.error("[packet-pdf] trigger download failed", err);
    throw err;
  }
}

