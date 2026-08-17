import { readJson, writeJson } from "@/lib/storage/safe-storage";

const LEGACY_STORAGE_KEY = "wrong-note-custom-wrong-reasons";

function storageKey(userId: string): string {
  return `wrong-note-custom-wrong-reasons:${userId}`;
}

function cleanReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** 계정별 커스텀 틀린 이유 */
export function getCustomWrongReasonsLocal(userId: string): string[] {
  if (!userId) return [];
  return cleanReasons(readJson<string[]>(storageKey(userId), []));
}

export function saveCustomWrongReasonsLocal(
  userId: string,
  reasons: string[],
): boolean {
  if (!userId) return false;
  return writeJson(storageKey(userId), cleanReasons(reasons)).ok;
}

export function addCustomWrongReasonLocal(
  userId: string,
  reason: string,
): string[] {
  const trimmed = reason.trim();
  if (!trimmed) return getCustomWrongReasonsLocal(userId);
  const next = [
    trimmed,
    ...getCustomWrongReasonsLocal(userId).filter((r) => r !== trimmed),
  ].slice(0, 40);
  saveCustomWrongReasonsLocal(userId, next);
  return next;
}

/** 예전 공용 키는 계정 간 오염을 막기 위해 비움 */
export function clearLegacyCustomWrongReasonsLocal(): void {
  try {
    writeJson(LEGACY_STORAGE_KEY, []);
  } catch {
    /* ignore */
  }
}
