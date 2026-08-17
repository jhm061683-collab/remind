import { readJson, writeJson } from "@/lib/storage/safe-storage";
import {
  EMPTY_KEYWORD_LIBRARY,
  normalizeKeywordLabel,
  type KeywordEntry,
  type KeywordKind,
  type KeywordLibrary,
} from "@/lib/keywords/library";

const LEGACY_STORAGE_KEY = "wrong-note-keyword-library";

function storageKey(userId: string): string {
  return `wrong-note-keyword-library:${userId}`;
}

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

function normalizeLibrary(raw: Partial<KeywordLibrary> | null | undefined): KeywordLibrary {
  return {
    problem: normalizeEntries(raw?.problem),
    wrong: normalizeEntries(raw?.wrong),
  };
}

/** 계정별 키워드 라이브러리 (다른 계정과 섞이지 않음) */
export function getKeywordLibraryLocal(userId: string): KeywordLibrary {
  if (!userId) return { problem: [], wrong: [] };
  const raw = readJson<Partial<KeywordLibrary>>(
    storageKey(userId),
    EMPTY_KEYWORD_LIBRARY,
  );
  return normalizeLibrary(raw);
}

export function saveKeywordLibraryLocal(
  userId: string,
  library: KeywordLibrary,
): boolean {
  if (!userId) return false;
  return writeJson(storageKey(userId), {
    problem: normalizeEntries(library.problem),
    wrong: normalizeEntries(library.wrong),
  }).ok;
}

export function getKindEntriesLocal(
  userId: string,
  kind: KeywordKind,
): KeywordEntry[] {
  return getKeywordLibraryLocal(userId)[kind];
}

/** 예전 공용 키는 계정 간 오염을 막기 위해 비움 */
export function clearLegacyKeywordLibraryLocal(): void {
  try {
    writeJson(LEGACY_STORAGE_KEY, EMPTY_KEYWORD_LIBRARY);
  } catch {
    /* ignore */
  }
}
