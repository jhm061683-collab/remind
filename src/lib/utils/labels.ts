import type { ReviewPhase } from "@/types/subject";

const PHASE_LABELS: Record<ReviewPhase, string> = {
  short: "단기",
  medium: "중기",
  long: "장기",
  completed: "완료",
};

/** 뱃지용 짧은 이름 + 의미 */
const PHASE_HINTS: Record<ReviewPhase, string> = {
  short: "며칠 뒤에 다시",
  medium: "더 뒤에 다시",
  long: "오래 뒤에 다시",
  completed: "끝났어요",
};

export function getPhaseLabel(phase: ReviewPhase): string {
  return PHASE_LABELS[phase];
}

export function getPhaseHint(phase: ReviewPhase): string {
  return PHASE_HINTS[phase];
}

export function formatDate(date: string | Date): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
