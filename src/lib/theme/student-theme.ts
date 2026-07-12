export type StudentTheme = "remind-dark" | "remind-light";

export const DEFAULT_STUDENT_THEME: StudentTheme = "remind-light";

export const STUDENT_THEME_STORAGE_KEY = "remind-student-theme";

export function themeStorageKey(userId: string): string {
  return `remind-student-theme:${userId}`;
}

export function isStudentTheme(value: string | null): value is StudentTheme {
  return value === "remind-dark" || value === "remind-light";
}
