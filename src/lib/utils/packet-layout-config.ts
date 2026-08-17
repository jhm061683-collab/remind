/** 오답 모음 PDF 조판 설정 — 하드코딩 대신 중앙 관리 */

export type PacketMathSolveSpace = "compact" | "normal" | "wide";

export type PacketLayoutConfig = {
  math: {
    /** 문제 본문 아래 학생 풀이 여백 */
    solveSpace: PacketMathSolveSpace;
    /** mm 직접 지정 시 solveSpace보다 우선 */
    solveSpaceMm?: number;
    /** 수학 문제 block 사이 간격(pt) — UI itemGap과 병행 가능 */
    blockGapPt: number;
  };
  korean: {
    /** 국어 문제 block 사이 간격(pt) */
    questionGapPt: number;
    /** ①~⑤ 행 간격(px, 측정 DOM 기준) */
    choiceGapPx: number;
    /** 지문 헤더 orphan 방지 — 최소 본문 줄 수 */
    minLinesAfterHeader: number;
    /** 지문 chunk 사이 간격(pt) */
    passageBlockGapPt: number;
    /** 남은 단 공간을 세밀하게 채우기 위한 지문 chunk 최대 글자 수 */
    passageChunkMaxChars: number;
  };
  page: {
    /** DOM 측정 안전 배수 — 과소추정 방지, 1.0~1.2 권장 */
    measureSafety: number;
  };
};

export const DEFAULT_PACKET_LAYOUT_CONFIG: PacketLayoutConfig = {
  math: {
    solveSpace: "normal",
    blockGapPt: 10,
  },
  korean: {
    questionGapPt: 8,
    choiceGapPx: 3,
    minLinesAfterHeader: 3,
    passageBlockGapPt: 6,
    passageChunkMaxChars: 220,
  },
  page: {
    // DOM과 react-pdf의 실제 줄높이 차만 보정한다.
    // 과도한 배수는 들어갈 문항까지 다음 단으로 밀어 페이지를 낭비한다.
    measureSafety: 1.05,
  },
};

const MM_TO_PT = 72 / 25.4;

const SOLVE_SPACE_MM: Record<PacketMathSolveSpace, number> = {
  compact: 18,
  normal: 32,
  wide: 48,
};

/** mm → pt */
export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/** 설정된 수학 풀이 여백(pt) */
export function resolveMathSolveSpacePt(
  config: PacketLayoutConfig = DEFAULT_PACKET_LAYOUT_CONFIG,
): number {
  if (config.math.solveSpaceMm != null && config.math.solveSpaceMm >= 0) {
    return mmToPt(config.math.solveSpaceMm);
  }
  return mmToPt(SOLVE_SPACE_MM[config.math.solveSpace]);
}

export type PacketLayoutConfigPatch = {
  math?: Partial<PacketLayoutConfig["math"]>;
  korean?: Partial<PacketLayoutConfig["korean"]>;
  page?: Partial<PacketLayoutConfig["page"]>;
};

export function mergePacketLayoutConfig(
  partial?: PacketLayoutConfigPatch,
): PacketLayoutConfig {
  if (!partial) return { ...DEFAULT_PACKET_LAYOUT_CONFIG };
  return {
    math: { ...DEFAULT_PACKET_LAYOUT_CONFIG.math, ...partial.math },
    korean: { ...DEFAULT_PACKET_LAYOUT_CONFIG.korean, ...partial.korean },
    page: { ...DEFAULT_PACKET_LAYOUT_CONFIG.page, ...partial.page },
  };
}
