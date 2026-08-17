/** 오답 모음 PDF — 과목별 조판 정책·페이지 패킹 */

import type { PacketLayoutConfig } from "@/lib/utils/packet-layout-config";

export type PacketLayoutMode = "math" | "exam";

export type PackFitLog = {
  unitKey: string;
  side: "left" | "right" | "solo";
  height: number;
  usedBefore: number;
  colHeight: number;
  movedBecauseDoesNotFit: boolean;
  reason?: string;
};

export type PackableUnit = {
  key: string;
  itemId: string;
  mode: PacketLayoutMode;
  /** 통과 가능(지문) vs 통째 이동(문제/수식) */
  splittable: boolean;
  /** 렌더 스타일 */
  chrome: "none" | "exam" | "math";
  sectionLabel?: "지문" | "문제";
  showMeta: boolean;
  continuation: boolean;
  textContent?: string;
  bodyCapture?: { dataUrl: string; width: number; height: number };
  height: number;
};

export type PackedColumns = {
  left: PackableUnit[];
  right: PackableUnit[];
  mode: PacketLayoutMode;
};

export type PacketLayoutValidation = {
  emptyPages: number;
  overflowingColumns: number;
  duplicatedAtomicUnits: number;
  orphanSectionHeaders: number;
  unjustifiedMoves: number;
};

/** 패킹 결과의 공통 불변조건을 PDF 생성 전에 검사한다. */
export function validatePackedLayout(
  pages: PackedColumns[],
  fitLogs: PackFitLog[],
  colHeight: number,
  minLinesAfterHeader: number,
): PacketLayoutValidation {
  const seenAtomic = new Set<string>();
  let emptyPages = 0;
  let overflowingColumns = 0;
  let duplicatedAtomicUnits = 0;
  let orphanSectionHeaders = 0;

  for (const page of pages) {
    if (page.left.length === 0 && page.right.length === 0) emptyPages += 1;

    for (const column of [page.left, page.right]) {
      const height = column.reduce((sum, unit) => sum + unit.height, 0);
      const allowedOversize =
        column.length === 1 &&
        !column[0]!.splittable &&
        column[0]!.height > colHeight;
      if (height > colHeight + 0.5 && !allowedOversize) {
        overflowingColumns += 1;
      }

      for (const unit of column) {
        if (!unit.splittable) {
          if (seenAtomic.has(unit.key)) duplicatedAtomicUnits += 1;
          seenAtomic.add(unit.key);
        }
        if (
          unit.sectionLabel === "지문" &&
          unit.textContent &&
          isPassageHeaderOnly(unit.textContent, minLinesAfterHeader)
        ) {
          orphanSectionHeaders += 1;
        }
      }
    }
  }

  const unjustifiedMoves = fitLogs.filter(
    (log) =>
      log.reason === "columnFull" &&
      log.usedBefore + log.height <= log.colHeight + 0.5,
  ).length;

  return {
    emptyPages,
    overflowingColumns,
    duplicatedAtomicUnits,
    orphanSectionHeaders,
    unjustifiedMoves,
  };
}

function looksMathHeavy(content?: string): boolean {
  if (!content?.trim()) return false;
  if (
    /적절한\s*것은|고르면|윗글에서|다음\s*글에서|main\s*idea/i.test(content) &&
    !/\\frac|\\int|\\sum|\\sqrt|\\begin\{|\\lim/.test(content)
  ) {
    return false;
  }
  return /\$\$|\$|\\\(|\\\[|\\frac|\\sum|\\int|\\sqrt|\\begin\{/.test(content);
}

export function resolveLayoutMode(item: {
  subjectName: string;
  problemLatex?: string;
}): PacketLayoutMode {
  const subj = item.subjectName ?? "";
  if (/국어|영어|사회|한국사|윤리|생활|독서|문학|언어|한문/.test(subj)) {
    return "exam";
  }
  if (/수학|미적|기하|확률|통계|물리|화학|생물|지구/.test(subj)) {
    return "math";
  }
  return looksMathHeavy(item.problemLatex) ? "math" : "exam";
}

/** 순서 유지하며 left/right 높이 차 최소 split 찾기 */
export function findBalancedSplit(
  heights: number[],
  colHeight: number,
): number {
  const n = heights.length;
  if (n === 0) return 0;
  if (n === 1) return 1;

  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let s = 0; s <= n; s++) {
    let left = 0;
    let right = 0;
    for (let i = 0; i < s; i++) left += heights[i]!;
    for (let i = s; i < n; i++) right += heights[i]!;
    if (left > colHeight + 0.5 || right > colHeight + 0.5) continue;
    let score = Math.abs(left - right);
    // 2개 이상인데 한쪽이 비면 큰 페널티
    if (n >= 2 && (s === 0 || s === n)) score += colHeight;
    // 양쪽 사용을 약간 선호
    if (s > 0 && s < n) score -= 8;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }

  if (!Number.isFinite(bestScore)) {
    // fallback: 왼쪽부터 채우기
    let used = 0;
    let s = 0;
    for (; s < n; s++) {
      if (used + heights[s]! > colHeight && used > 0) break;
      used += heights[s]!;
    }
    return Math.max(1, s);
  }
  return best;
}

/**
 * 수학: 한 페이지에 들어갈 문항을 모은 뒤
 * 순서 유지 balanced split으로 좌/우 배치.
 */
export function packMathBalanced(
  units: PackableUnit[],
  colHeight: number,
  gap = 6,
  fitLogs?: PackFitLog[],
): PackedColumns[] {
  const pages: PackedColumns[] = [];
  let i = 0;

  const canFit = (heights: number[]): boolean => {
    const n = heights.length;
    for (let s = 0; s <= n; s++) {
      let left = 0;
      let right = 0;
      for (let a = 0; a < s; a++) left += heights[a]!;
      for (let a = s; a < n; a++) right += heights[a]!;
      if (left <= colHeight + 0.5 && right <= colHeight + 0.5) return true;
    }
    return false;
  };

  while (i < units.length) {
    const u = units[i]!;
    const h = u.height;

    // 단 높이 초과 atomic — 혼자 한 페이지(왼쪽만, 옆 단 비움)
    if (h > colHeight + 0.5) {
      fitLogs?.push({
        unitKey: u.key,
        side: "solo",
        height: h,
        usedBefore: 0,
        colHeight,
        movedBecauseDoesNotFit: true,
        reason: "mathOversizeAtomic",
      });
      pages.push({ left: [{ ...u, height: h }], right: [], mode: "math" });
      i += 1;
      continue;
    }

    const pageUnits: PackableUnit[] = [];

    while (i < units.length) {
      const u2 = units[i]!;
      const h2 = u2.height;
      if (h2 > colHeight + 0.5) break;
      const trial = [...pageUnits.map((x) => x.height + gap), h2 + gap];
      if (pageUnits.length === 0 || canFit(trial)) {
        pageUnits.push({ ...u2, height: h2 });
        i += 1;
        continue;
      }
      break;
    }

    if (pageUnits.length === 0) continue;

    const heights = pageUnits.map((u3) => u3.height + gap);
    const split = findBalancedSplit(heights, colHeight + gap);
    let leftUsed = 0;
    let rightUsed = 0;
    pageUnits.forEach((unit, index) => {
      const target = index < split ? "left" : "right";
      const usedBefore = target === "left" ? leftUsed : rightUsed;
      fitLogs?.push({
        unitKey: unit.key,
        side: target,
        height: unit.height,
        usedBefore,
        colHeight,
        movedBecauseDoesNotFit: false,
      });
      if (target === "left") leftUsed += unit.height + gap;
      else rightUsed += unit.height + gap;
    });
    pages.push({
      left: pageUnits.slice(0, split),
      right: pageUnits.slice(split),
      mode: "math",
    });
  }

  return pages;
}

/**
 * 국어/영어: 흐름형 채우기 (L→R→다음장).
 * splittable 단위는 남은 높이에 맞게 이미 쪼개져 들어온다고 가정.
 * atomic(문제)은 공간 부족 시 다음 단/페이지로 통째 이동.
 * 실제 높이를 보존 — colHeight로 깎지 않음.
 * 단보다 큰 유닛은 혼자 한 페이지(왼쪽만)에 두고 옆 단을 비움 —
 * 넘친 콘텐츠가 옆 단과 겹치는 react-pdf 버그를 막는다.
 */
export function packExamFlow(
  units: PackableUnit[],
  colHeight: number,
  fitLogs?: PackFitLog[],
): PackedColumns[] {
  const pages: PackedColumns[] = [];
  let page: PackedColumns = { left: [], right: [], mode: "exam" };
  let side: "left" | "right" = "left";
  let used = 0;

  const flush = () => {
    if (page.left.length > 0 || page.right.length > 0) {
      pages.push(page);
    }
    page = { left: [], right: [], mode: "exam" };
    side = "left";
    used = 0;
  };

  const advance = () => {
    if (side === "left") {
      side = "right";
      used = 0;
      return;
    }
    flush();
  };

  for (const unit of units) {
    const h = unit.height;

    // 단 높이를 넘는 atomic → 단독 페이지 (옆 단 배치 금지)
    if (!unit.splittable && h > colHeight + 0.5) {
      if (page.left.length > 0 || page.right.length > 0) flush();
      fitLogs?.push({
        unitKey: unit.key,
        side: "solo",
        height: h,
        usedBefore: 0,
        colHeight,
        movedBecauseDoesNotFit: true,
        reason: "examOversizeAtomic",
      });
      pages.push({ left: [{ ...unit, height: h }], right: [], mode: "exam" });
      side = "left";
      used = 0;
      continue;
    }

    const usedBefore = used;
    if (used > 0 && used + h > colHeight + 0.5) {
      fitLogs?.push({
        unitKey: unit.key,
        side,
        height: h,
        usedBefore,
        colHeight,
        movedBecauseDoesNotFit: true,
        reason: "columnFull",
      });
      advance();
    }

    page[side].push({ ...unit, height: h });
    used += h;
    fitLogs?.push({
      unitKey: unit.key,
      side,
      height: h,
      usedBefore: used - h,
      colHeight,
      movedBecauseDoesNotFit: false,
    });
  }

  flush();
  return pages.length > 0 ? pages : [{ left: [], right: [], mode: "exam" }];
}

/** 지문 chunk가 헤더/안내문만 있고 본문이 부족한지 */
export function isPassageHeaderOnly(
  text: string,
  minBodyLines: number,
): boolean {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return true;

  let bodyLines = 0;
  for (const line of lines) {
    if (/^지문$/.test(line)) continue;
    if (/^\[\d+~\d+\]/.test(line) && line.length < 120) continue;
    if (/다음\s*글을\s*읽고|물음에\s*답하|Read\s+the\s+following/i.test(line) && line.length < 120) {
      continue;
    }
    if (/^\(\s*[가-힣]\s*\)\s*$/.test(line)) continue;
    bodyLines += 1;
  }
  return bodyLines < minBodyLines;
}

/** 헤더만 있는 passage chunk를 다음 chunk와 병합 — orphan header 방지 */
export function guardPassageHeaderOrphans(
  pieces: string[],
  minBodyLines: number,
): string[] {
  if (pieces.length <= 1) return pieces;
  const out: string[] = [];
  let i = 0;
  while (i < pieces.length) {
    let chunk = pieces[i]!;
    while (
      i + 1 < pieces.length &&
      isPassageHeaderOnly(chunk, minBodyLines)
    ) {
      i += 1;
      chunk = `${chunk}\n\n${pieces[i]!}`;
    }
    out.push(chunk);
    i += 1;
  }
  return out;
}

/**
 * 단 높이를 넘는 긴 문항을 stem(+보기) / 선택지로만 안전하게 내부 분할.
 * 일반 문항은 그대로 둔다.
 */
export function splitTallExamQuestion(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const choiceRe = /(?:^|\n)([\t ]*[\u2460-\u2473][ \t]+)/;
  const choiceMatch = choiceRe.exec(normalized);
  if (!choiceMatch || choiceMatch.index == null) return [normalized];

  const choiceAt =
    choiceMatch[0].startsWith("\n") ? choiceMatch.index + 1 : choiceMatch.index;
  if (choiceAt < 20) return [normalized];

  const head = normalized.slice(0, choiceAt).trim();
  const tail = normalized.slice(choiceAt).trim();
  if (!head || !tail) return [normalized];
  return [head, tail];
}

/** 연속 구간을 모드별로 나눠 각각 패킹 */
export function packByLayoutMode(
  units: PackableUnit[],
  colHeight: number,
  config?: PacketLayoutConfig,
  fitLogs?: PackFitLog[],
): PackedColumns[] {
  const gap = config?.math.blockGapPt ?? 6;
  const out: PackedColumns[] = [];
  let i = 0;
  while (i < units.length) {
    const mode = units[i]!.mode;
    let j = i + 1;
    while (j < units.length && units[j]!.mode === mode) j += 1;
    const slice = units.slice(i, j);
    if (mode === "math") {
      out.push(...packMathBalanced(slice, colHeight, gap, fitLogs));
    } else {
      out.push(...packExamFlow(slice, colHeight, fitLogs));
    }
    i = j;
  }
  return out.length > 0 ? out : [{ left: [], right: [], mode: "exam" }];
}

/**
 * 공통 지문 뒤 본문에 여러 객관식 문항(1. 2. …)이 한 덩어리로 있으면
 * 각 문항을 atomic 유닛으로 쪼갠다.
 */
export function splitExamQuestionPieces(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const starts: number[] = [];
  const re = /(?:^|\n)(\d{1,2})[\.．\)]\s+\S/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const at = m.index + (m[0].startsWith("\n") ? 1 : 0);
    // 연속 번호(1,2,3…) 또는 첫 문항만 인정 — 본문 중 "3. " 오탐 완화
    const num = Number(m[1]);
    if (starts.length === 0) {
      if (at <= 2 || num <= 20) starts.push(at);
      continue;
    }
    const prevSlice = normalized.slice(starts[starts.length - 1]!, at);
    const prevNum = Number(
      prevSlice.match(/^(\d{1,2})[\.．\)]/)?.[1] ?? "0",
    );
    if (num === prevNum + 1 || (num > prevNum && num - prevNum <= 3)) {
      starts.push(at);
    }
  }

  if (starts.length <= 1) return [normalized];

  const pieces: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]!;
    const to = i + 1 < starts.length ? starts[i + 1]! : normalized.length;
    const part = normalized.slice(from, to).trim();
    if (part) pieces.push(part);
  }
  return pieces.length > 0 ? pieces : [normalized];
}

/** 지문 문단·줄 단위로 쪼개 단 높이에 맞게 채울 조각 생성 */
export function splitExamPassagePieces(
  text: string,
  maxChars: number,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const paras = normalized.split(/\n{2,}/);
  const pieces: string[] = [];

  for (const para of paras) {
    const p = para.trim();
    if (!p) continue;
    if (p.length <= maxChars) {
      pieces.push(p);
      continue;
    }
    // 문장 경계 우선 분할
    let rest = p;
    while (rest.length > maxChars) {
      let cut = maxChars;
      const window = rest.slice(0, maxChars);
      const sentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("。"),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
        window.lastIndexOf(".\n"),
      );
      const space = Math.max(
        window.lastIndexOf(" "),
        window.lastIndexOf("\n"),
        window.lastIndexOf("，"),
        window.lastIndexOf(", "),
      );
      if (sentence >= maxChars * 0.45) cut = sentence + 1;
      else if (space >= maxChars * 0.4) cut = space + 1;
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pieces.push(rest);
  }

  // orphan: 마지막 조각이 너무 짧으면 이전과 합침
  if (pieces.length >= 2) {
    const last = pieces[pieces.length - 1]!;
    if (last.length < 40) {
      const prev = pieces[pieces.length - 2]!;
      pieces[pieces.length - 2] = `${prev}\n\n${last}`;
      pieces.pop();
    }
  }

  return pieces;
}
