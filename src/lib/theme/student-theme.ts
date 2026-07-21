export type StudentTheme = "remind-dark" | "remind-light";

export const DEFAULT_STUDENT_THEME: StudentTheme = "remind-light";

export const STUDENT_THEME_STORAGE_KEY = "remind-student-theme";
export const STUDENT_THEME_COOKIE = "remind-student-theme";

export function themeStorageKey(userId: string): string {
  return `remind-student-theme:${userId}`;
}

export function isStudentTheme(value: string | null | undefined): value is StudentTheme {
  return value === "remind-dark" || value === "remind-light";
}

export function parseStudentThemeCookie(
  value: string | undefined,
): StudentTheme | null {
  if (!value) return null;
  return isStudentTheme(value) ? value : null;
}
