export const REVIEW_SET_SIZE = 10;
export const REVIEW_MINUTES_PER_ITEM = 0.8;

export type ReviewDueItem = {
  id: string;
  nextReviewDate: string;
  lastAnsweredAt?: string;
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

export function reviewSetStorageKey(userId: string): string {
  return `remind-review-set:${userId}`;
}

export type SavedReviewSet = {
  ids: string[];
  dueTotal: number;
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
