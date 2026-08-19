export const REVIEW_SET_SIZE = 10;
export const REVIEW_MINUTES_PER_ITEM = 0.8;

export type ReviewDueItem = {
  id: string;
  subjectId?: string;
  nextReviewDate: string;
  lastAnsweredAt?: string;
};

export type ReviewMode = "all" | "subject" | "random";

export type ReviewSelection = {
  mode: ReviewMode;
  subjectId?: string;
  seed?: number;
};

/** due 목록은 이미 오래된 순이라고 가정하고, 한 세트만 고른다. 복습 공식은 바꾸지 않는다. */
export function selectReviewSet<T extends ReviewDueItem>(
  due: T[],
  size = REVIEW_SET_SIZE,
): T[] {
  const limit = Math.max(1, Math.min(10, size));
  return due.slice(0, Math.min(limit, due.length));
}

export function estimateSetMinutes(count: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(count * REVIEW_MINUTES_PER_ITEM));
}

function seededOrder(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createReviewSeed(userId: string, dateKey: string): number {
  let hash = 2166136261;
  for (const char of `${userId}:${dateKey}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 필터와 표시 순서만 바꾸며 원본 due 배열과 복습 날짜는 수정하지 않는다. */
export function selectReviewSetByMode<T extends ReviewDueItem>(
  due: T[],
  selection: ReviewSelection,
  size = REVIEW_SET_SIZE,
): T[] {
  const scoped =
    selection.subjectId &&
    (selection.mode === "subject" || selection.mode === "random")
      ? due.filter((item) => item.subjectId === selection.subjectId)
      : [...due];
  if (selection.mode !== "random") return selectReviewSet(scoped, size);

  const random = seededOrder(selection.seed ?? 1);
  for (let i = scoped.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [scoped[i], scoped[j]] = [scoped[j]!, scoped[i]!];
  }
  return selectReviewSet(scoped, size);
}

export function countDueBySubject<T extends ReviewDueItem>(
  due: T[],
): Array<{ subjectId: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of due) {
    if (!item.subjectId) continue;
    counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([subjectId, count]) => ({ subjectId, count }))
    .sort((a, b) => b.count - a.count || a.subjectId.localeCompare(b.subjectId));
}

export function reviewSetStorageKey(userId: string): string {
  return `remind-review-set:${userId}`;
}

export type SavedReviewSet = {
  ids: string[];
  dueTotal: number;
  selection?: ReviewSelection;
};

export function readSavedReviewSet(userId: string): SavedReviewSet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(reviewSetStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedReviewSet;
    if (!Array.isArray(parsed.ids) || parsed.ids.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSavedReviewSet(userId: string, value: SavedReviewSet): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(reviewSetStorageKey(userId), JSON.stringify(value));
}

export function clearSavedReviewSet(userId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(reviewSetStorageKey(userId));
}

export function resumeReviewSet<T extends ReviewDueItem>(
  due: T[],
  saved: SavedReviewSet | null,
  size = REVIEW_SET_SIZE,
): T[] {
  if (!saved) return selectReviewSet(due, size);
  const byId = new Map(due.map((item) => [item.id, item]));
  const resumed = saved.ids
    .map((id) => byId.get(id))
    .filter((item): item is T => Boolean(item));
  if (resumed.length === 0) return selectReviewSet(due, size);
  return resumed;
}
