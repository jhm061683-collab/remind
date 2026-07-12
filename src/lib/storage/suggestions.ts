import type { StoredSuggestion } from "@/lib/types/suggestions";

export type { StoredSuggestion };

const KEY = "remind_suggestions_v1";

function readAll(): StoredSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSuggestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: StoredSuggestion[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listSuggestionsLocal(userId?: string): StoredSuggestion[] {
  const all = readAll();
  if (!userId) return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSuggestionLocal(input: {
  userId: string;
  userName: string;
  academyId?: string;
  body: string;
}): StoredSuggestion {
  const item: StoredSuggestion = {
    id: crypto.randomUUID(),
    userId: input.userId,
    userName: input.userName,
    academyId: input.academyId,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  const next = [item, ...readAll()].slice(0, 200);
  writeAll(next);
  return item;
}
