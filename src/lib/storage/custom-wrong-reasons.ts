import { readJson, writeJson } from "@/lib/storage/safe-storage";

const STORAGE_KEY = "wrong-note-custom-wrong-reasons";

export function getCustomWrongReasonsLocal(): string[] {
  const raw = readJson<string[]>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function saveCustomWrongReasonsLocal(reasons: string[]): boolean {
  const cleaned = reasons
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 40);
  return writeJson(STORAGE_KEY, cleaned).ok;
}

export function addCustomWrongReasonLocal(reason: string): string[] {
  const trimmed = reason.trim();
  if (!trimmed) return getCustomWrongReasonsLocal();
  const next = [
    trimmed,
    ...getCustomWrongReasonsLocal().filter((r) => r !== trimmed),
  ].slice(0, 40);
  saveCustomWrongReasonsLocal(next);
  return next;
}
