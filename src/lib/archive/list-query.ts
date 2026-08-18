export type ArchiveLoadState = "loading" | "error" | "ready";

export function parseArchivePage(raw: string | null, pageCount: number): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return Math.min(Math.max(pageCount, 1), Math.max(1, page));
}

export function shouldShowArchiveEmpty(
  loadState: ArchiveLoadState,
  questionCount: number,
): boolean {
  return loadState === "ready" && questionCount === 0;
}
