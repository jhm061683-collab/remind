export type KeywordKind = "problem" | "wrong";

export type KeywordEntry = {
  label: string;
  favorite: boolean;
  useCount: number;
  updatedAt: string;
};

export type KeywordLibrary = {
  problem: KeywordEntry[];
  wrong: KeywordEntry[];
};

export const EMPTY_KEYWORD_LIBRARY: KeywordLibrary = {
  problem: [],
  wrong: [],
};

export function normalizeKeywordLabel(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim();
}

export function sortKeywordEntries(entries: KeywordEntry[]): KeywordEntry[] {
  return [...entries].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (b.useCount !== a.useCount) return b.useCount - a.useCount;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function upsertKeywordEntry(
  entries: KeywordEntry[],
  label: string,
  opts?: { bumpUse?: boolean; favorite?: boolean },
): KeywordEntry[] {
  const normalized = normalizeKeywordLabel(label);
  if (!normalized) return entries;
  const now = new Date().toISOString();
  const idx = entries.findIndex(
    (e) => e.label.toLowerCase() === normalized.toLowerCase(),
  );
  if (idx === -1) {
    return [
      {
        label: normalized,
        favorite: Boolean(opts?.favorite),
        useCount: opts?.bumpUse ? 1 : 0,
        updatedAt: now,
      },
      ...entries,
    ].slice(0, 80);
  }
  const current = entries[idx]!;
  const next = [...entries];
  next[idx] = {
    ...current,
    label: normalized,
    favorite: opts?.favorite ?? current.favorite,
    useCount: opts?.bumpUse ? current.useCount + 1 : current.useCount,
    updatedAt: now,
  };
  return next;
}

export function toggleFavoriteEntry(
  entries: KeywordEntry[],
  label: string,
): KeywordEntry[] {
  const normalized = normalizeKeywordLabel(label);
  return entries.map((e) =>
    e.label.toLowerCase() === normalized.toLowerCase()
      ? { ...e, favorite: !e.favorite, updatedAt: new Date().toISOString() }
      : e,
  );
}

export function removeKeywordEntry(
  entries: KeywordEntry[],
  label: string,
): KeywordEntry[] {
  const normalized = normalizeKeywordLabel(label).toLowerCase();
  return entries.filter((e) => e.label.toLowerCase() !== normalized);
}
