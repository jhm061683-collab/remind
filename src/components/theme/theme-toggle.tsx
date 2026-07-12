"use client";

import { useStudentTheme } from "@/components/theme/student-theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useStudentTheme();
  const isDark = theme === "remind-dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "밝은 모드로 전환" : "어두운 모드로 전환"}
      title={isDark ? "밝은 모드" : "어두운 모드"}
      className="rm-nav-item rounded-xl p-2 text-base leading-none transition hover:bg-[var(--rm-surface)]"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
