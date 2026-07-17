"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_THEME_COOKIE,
  adminThemeStorageKey,
} from "@/lib/theme/admin-theme";
import {
  DEFAULT_STUDENT_THEME,
  isStudentTheme,
  type StudentTheme,
} from "@/lib/theme/student-theme";

type AdminThemeContextValue = {
  theme: StudentTheme;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function persistTheme(userId: string, theme: StudentTheme) {
  localStorage.setItem(adminThemeStorageKey(userId), theme);
  document.cookie = `${ADMIN_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

type Props = {
  userId: string;
  initialTheme?: StudentTheme;
  children: ReactNode;
};

export function AdminThemeProvider({
  userId,
  initialTheme = DEFAULT_STUDENT_THEME,
  children,
}: Props) {
  const [theme, setTheme] = useState<StudentTheme>(initialTheme);

  useEffect(() => {
    const saved = localStorage.getItem(adminThemeStorageKey(userId));
    if (isStudentTheme(saved)) {
      if (saved !== initialTheme) {
        setTheme(saved);
      }
      persistTheme(userId, saved);
      return;
    }
    persistTheme(userId, initialTheme);
  }, [userId, initialTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: StudentTheme =
        current === "remind-dark" ? "remind-light" : "remind-dark";
      persistTheme(userId, next);
      return next;
    });
  }, [userId]);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        className="relative flex min-h-full flex-1 flex-col"
      >
        <div className="rm-ambient" aria-hidden />
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return ctx;
}

export function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === "remind-dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "밝은 모드로 전환" : "어두운 모드로 전환"}
      title={isDark ? "밝은 모드" : "어두운 모드"}
      className="rounded-full border border-[var(--rm-border)] bg-[var(--rm-surface)] p-1.5 text-sm leading-none text-[var(--rm-text-muted)] transition hover:border-[var(--rm-border-glow)] hover:bg-[var(--rm-accent-muted)] hover:text-[var(--rm-text)]"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
