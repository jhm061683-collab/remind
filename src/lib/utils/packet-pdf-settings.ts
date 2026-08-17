/** 오답 모음 PDF 설정의 단일 source of truth */

export type PacketItemGap = "tight" | "normal" | "loose";

/** 내부 캡처 밀도 — UI에서는 더 이상 노출하지 않음 */
export type PacketMathSpacing = "tight" | "normal" | "loose";

const ITEM_GAPS: readonly PacketItemGap[] = ["tight", "normal", "loose"];

export const PACKET_ITEM_GAP_OPTIONS: {
  value: PacketItemGap;
  label: string;
  hint: string;
}[] = [
  { value: "tight", label: "좁게", hint: "문항 사이를 붙여요" },
  { value: "normal", label: "보통", hint: "기본 문항 간격" },
  { value: "loose", label: "넓게", hint: "문항 사이를 띄워요" },
];

/** 문제와 문제 사이 간격(pt) — 수학·국어 조판이 같은 값을 씀 */
export const ITEM_GAP_PT: Record<PacketItemGap, number> = {
  tight: 4,
  normal: 10,
  loose: 16,
};

const PT_TO_PX = 96 / 72;

export const DEFAULT_PACKET_PDF_ITEM_GAP: PacketItemGap = "normal";

/**
 * 수학 본문 캡처 기본값.
 * 예전 UI 기본(촘촘)과 같게 두어 기존 출력 밀도를 유지한다.
 */
export const DEFAULT_PACKET_MATH_SPACING: PacketMathSpacing = "tight";

export type NormalizedPacketPdfSettings = {
  itemGap: PacketItemGap;
  mathSpacing: PacketMathSpacing;
};

export const QUICK_ANSWER_MATH_FIXTURES: readonly string[] = [
  "2x-y=0",
  "(10,0)",
  "\\frac{\\sqrt{5}}{2}",
  "\\sqrt{29}",
  "x^2+y^2=1",
  "a_1+a_2",
  "\\frac{a+b}{2}",
];

/** 분수·루트처럼 세로로 큰 식 */
export function isTallQuickAnswerMath(expression: string): boolean {
  return /\\frac|\\sqrt/.test(expression);
}

/**
 * 빠른정답 수식 셀 공통 CSS — 미리보기·캡처가 같은 규칙을 쓴다.
 * 숫자 행은 .packet-answer-plain-cell, 수식 행만 여유 padding을 쓴다.
 */
export const PACKET_ANSWER_MATH_CSS = `
.packet-answer-plain-cell {
  height: auto;
  max-height: none;
  padding-top: 6px;
  padding-bottom: 6px;
  vertical-align: middle;
  line-height: 1.45;
}
.packet-answer-math-cell {
  overflow: visible !important;
  overflow-x: visible !important;
  overflow-y: visible !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0;
  line-height: normal;
  padding-top: 14px;
  padding-bottom: 16px;
  vertical-align: middle;
}
.packet-answer-math-cell--tall {
  padding-top: 16px;
  padding-bottom: 18px;
}
.packet-answer-math {
  display: inline-block;
  max-width: 100%;
  overflow: visible !important;
  height: auto;
  max-height: none;
  line-height: normal;
  padding: 0;
  vertical-align: middle;
}
.packet-answer-math--cell {
  display: block;
}
.packet-answer-math .katex-display {
  display: block;
  margin: 0;
  text-align: left;
  overflow: visible !important;
}
.packet-answer-math .katex {
  display: inline-block;
  max-width: 100%;
  line-height: normal !important;
  overflow: visible !important;
}
.packet-answer-math .katex-html,
.packet-answer-math .base {
  display: inline-block;
  overflow: visible !important;
}
`;

/** 수식 글리프와 셀 경계 사이 최소 여백(px) — 인쇄물 기준 */
export const QUICK_ANSWER_MATH_MIN_GAP_PX = 8;

function isItemGap(value: unknown): value is PacketItemGap {
  return typeof value === "string" && ITEM_GAPS.includes(value as PacketItemGap);
}

function readRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

/**
 * UI/저장/레거시 payload를 하나의 설정 객체로 정규화한다.
 * mathSpacing, mathDensity, mathSolveSpace, solveSpaceMode 는 무시한다.
 */
export function normalizePacketPdfSettings(
  input?: unknown,
): NormalizedPacketPdfSettings {
  const raw = readRecord(input);
  const itemGap = isItemGap(raw.itemGap)
    ? raw.itemGap
    : isItemGap(raw.questionGap)
      ? raw.questionGap
      : isItemGap(raw.problemGap)
        ? raw.problemGap
        : DEFAULT_PACKET_PDF_ITEM_GAP;

  return {
    itemGap,
    mathSpacing: DEFAULT_PACKET_MATH_SPACING,
  };
}

export function itemGapToPreviewPx(itemGap: PacketItemGap): number {
  return Math.round(ITEM_GAP_PT[itemGap] * PT_TO_PX);
}

export type PacketLayoutGapPatch = {
  math: { blockGapPt: number };
  korean: { questionGapPt: number };
};

/** 미리보기·PDF 생성기가 같은 간격 값을 쓰도록 레이아웃 조각으로 변환 */
export function packetLayoutGapFromSettings(
  settings: NormalizedPacketPdfSettings,
): PacketLayoutGapPatch {
  const gapPt = ITEM_GAP_PT[settings.itemGap];
  return {
    math: { blockGapPt: gapPt },
    korean: { questionGapPt: gapPt },
  };
}

export type MathClipProbe = {
  scrollHeight: number;
  clientHeight: number;
  overflowY: string;
};

export function isVerticallyClippedMathBox(el: MathClipProbe): boolean {
  const overflow = el.overflowY.trim().toLowerCase();
  const clips = overflow === "hidden" || overflow === "clip";
  return clips && el.scrollHeight > el.clientHeight + 1;
}

export function findVerticallyClippedMathCells(
  cells: MathClipProbe[],
): MathClipProbe[] {
  return cells.filter(isVerticallyClippedMathBox);
}

export type MathComfortProbe = {
  topGap: number;
  bottomGap: number;
};

export function isMathCellVerticallyComfortable(
  probe: MathComfortProbe,
  minGapPx = QUICK_ANSWER_MATH_MIN_GAP_PX,
): boolean {
  return probe.topGap >= minGapPx && probe.bottomGap >= minGapPx;
}

export function packetPdfSettingsVersion(
  settings: NormalizedPacketPdfSettings,
): string {
  return `itemGap:${settings.itemGap}`;
}

export function toPdfDownloadFileName(fileName: string): string {
  return fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
}

export function triggerPdfBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = toPdfDownloadFileName(fileName);
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export type DownloadLock = { current: boolean };

/**
 * 다운로드마다 독립 실행. success/error 모든 경로에서 lock을 해제한다.
 */
export async function runExclusiveDownload<T>(
  lock: DownloadLock,
  task: () => Promise<T>,
): Promise<T> {
  if (lock.current) {
    throw new Error("PDF_DOWNLOAD_IN_PROGRESS");
  }
  lock.current = true;
  try {
    return await task();
  } finally {
    lock.current = false;
  }
}
