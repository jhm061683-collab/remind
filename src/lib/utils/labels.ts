import type { ReviewPhase } from "@/types/subject";

const PHASE_LABELS: Record<ReviewPhase, string> = {
  short: "단기",
  medium: "중기",
  long: "장기",
  completed: "완료",
};

export function getPhaseLabel(phase: ReviewPhase): string {
  return PHASE_LABELS[phase];
}

export function formatDate(date: string | Date): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
