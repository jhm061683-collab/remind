import type { StudentTheme } from "@/lib/theme/student-theme";
import { isStudentTheme } from "@/lib/theme/student-theme";

export const ADMIN_THEME_COOKIE = "remind-admin-theme";

export function adminThemeStorageKey(userId: string) {
  return `remind-admin-theme:${userId}`;
}

export function parseAdminThemeCookie(
  value: string | undefined,
): StudentTheme | null {
  if (!value) return null;
  return isStudentTheme(value) ? value : null;
}
