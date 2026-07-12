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
import { saveStudentThemeAction } from "@/lib/actions/student-theme";
import {
  DEFAULT_STUDENT_THEME,
  isStudentTheme,
  themeStorageKey,
  type StudentTheme,
} from "@/lib/theme/student-theme";

type StudentThemeContextValue = {
  theme: StudentTheme;
  toggleTheme: () => void;
};

const StudentThemeContext = createContext<StudentThemeContextValue | null>(null);

type Props = {
  userId: string;
  initialTheme?: StudentTheme;
  children: ReactNode;
};

export function StudentThemeProvider({
  userId,
  initialTheme = DEFAULT_STUDENT_THEME,
  children,
}: Props) {
  const [theme, setTheme] = useState<StudentTheme>(initialTheme);

  useEffect(() => {
    const saved = localStorage.getItem(themeStorageKey(userId));
    if (isStudentTheme(saved)) {
      setTheme(saved);
      return;
    }
    setTheme(initialTheme);
  }, [userId, initialTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: StudentTheme =
        current === "remind-dark" ? "remind-light" : "remind-dark";
      localStorage.setItem(themeStorageKey(userId), next);
      void saveStudentThemeAction(next);
      return next;
    });
  }, [userId]);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <StudentThemeContext.Provider value={value}>
      <div data-theme={theme} className="relative flex min-h-full flex-1 flex-col">
        <div className="rm-ambient" aria-hidden />
        {children}
      </div>
    </StudentThemeContext.Provider>
  );
}

export function useStudentTheme(): StudentThemeContextValue {
  const ctx = useContext(StudentThemeContext);
  if (!ctx) {
    throw new Error("useStudentTheme must be used within StudentThemeProvider");
  }
  return ctx;
}
