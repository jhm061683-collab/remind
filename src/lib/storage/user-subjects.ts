import { readJson, writeJson } from "@/lib/storage/safe-storage";

export type UserSubject = {
  id: string;
  name: string;
};

export const DEFAULT_SUBJECTS: UserSubject[] = [
  { id: "math", name: "수학" },
  { id: "english", name: "영어" },
  { id: "korean", name: "국어" },
];

const STORAGE_KEY = "wrong-note-user-subjects";

function normalizeSubjects(raw: unknown): UserSubject[] {
  if (!Array.isArray(raw)) return DEFAULT_SUBJECTS;
  const parsed = raw
    .filter(
      (item): item is UserSubject =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as UserSubject).id === "string" &&
        typeof (item as UserSubject).name === "string" &&
        (item as UserSubject).name.trim().length > 0,
    )
    .map((item) => ({ id: item.id, name: item.name.trim() }));

  return parsed.length > 0 ? parsed : DEFAULT_SUBJECTS;
}

export function getUserSubjectsLocal(): UserSubject[] {
  return normalizeSubjects(readJson(STORAGE_KEY, DEFAULT_SUBJECTS));
}

export function saveUserSubjectsLocal(subjects: UserSubject[]): boolean {
  const normalized = normalizeSubjects(subjects);
  return writeJson(STORAGE_KEY, normalized).ok;
}

export function createSubjectId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
  return `sub-${slug || "new"}-${Date.now().toString(36)}`;
}
