import { readJson, writeJson } from "@/lib/storage/safe-storage";
import {
  EMPTY_KEYWORD_LIBRARY,
  normalizeKeywordLabel,
  type KeywordEntry,
  type KeywordKind,
  type KeywordLibrary,
} from "@/lib/keywords/library";

const STORAGE_KEY = "wrong-note-keyword-library";

function normalizeEntries(raw: unknown): KeywordEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<KeywordEntry>;
      const label = normalizeKeywordLabel(String(row.label ?? ""));
      if (!label) return null;
      return {
        label,
        favorite: Boolean(row.favorite),
        useCount: Number(row.useCount) || 0,
        updatedAt:
          typeof row.updatedAt === "string"
            ? row.updatedAt
            : new Date(0).toISOString(),
      } satisfies KeywordEntry;
    })
    .filter((e): e is KeywordEntry => Boolean(e))
    .slice(0, 80);
}

export function getKeywordLibraryLocal(): KeywordLibrary {
  const raw = readJson<Partial<KeywordLibrary>>(STORAGE_KEY, EMPTY_KEYWORD_LIBRARY);
  return {
    problem: normalizeEntries(raw.problem),
    wrong: normalizeEntries(raw.wrong),
  };
}

export function saveKeywordLibraryLocal(library: KeywordLibrary): boolean {
  return writeJson(STORAGE_KEY, {
    problem: normalizeEntries(library.problem),
    wrong: normalizeEntries(library.wrong),
  }).ok;
}

export function getKindEntriesLocal(kind: KeywordKind): KeywordEntry[] {
  return getKeywordLibraryLocal()[kind];
}
