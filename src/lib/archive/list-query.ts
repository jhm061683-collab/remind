export type ArchiveLoadState = "loading" | "error" | "ready";
export type ArchiveStatKind = "all" | "active" | "mastered" | "upcoming";

export type ArchiveListFilters = {
  q: string;
  subject: string;
  from: string;
  to: string;
  reasons: string[];
  wrongKeywords: string[];
};

export function parseArchiveFilters(
  searchParams:
    | URLSearchParams
    | { get(name: string): string | null; getAll(name: string): string[] },
): ArchiveListFilters {
  return {
    q: searchParams.get("q") ?? "",
    subject: searchParams.get("subject") ?? "all",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    reasons: searchParams.getAll("reason").filter(Boolean),
    wrongKeywords: searchParams.getAll("wrongKeyword").filter(Boolean),
  };
}

export function parseArchivePage(
  raw: string | null,
  pageCount: number,
): number {
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

export function archiveStatHref(kind: ArchiveStatKind): string {
  if (kind === "all") return "/archive";
  if (kind === "mastered") return "/archive?status=archived";
  return `/archive?status=${kind}`;
}
