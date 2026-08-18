"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";

type Props = {
  userName: string;
};

export function AccountMenu({ userName }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = userName.charAt(0) || "학";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`rm-nav-item inline-flex min-h-11 min-w-11 max-w-[9rem] items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition hover:bg-[var(--rm-surface)] ${
          open ? "rm-nav-item--active" : ""
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--rm-accent)]/15 text-[11px] font-bold text-[var(--rm-accent)]">
          {initial}
        </span>
        <span className="hidden truncate sm:inline">{userName}</span>
        <span className="text-[10px] text-[var(--rm-text-muted)]" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] py-1 shadow-lg"
        >
          <Link
            href="/account"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
          >
            계정 설정
          </Link>
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 sm:hidden">
            <span className="text-xs font-semibold text-[var(--rm-text-muted)]">
              화면 설정
            </span>
            <ThemeToggle />
          </div>
          <div className="px-3.5 py-1 sm:hidden">
            <InstallAppPrompt variant="chip" />
          </div>
          <Link
            href="/subjects"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
          >
            과목 설정
          </Link>
          <Link
            href="/help"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
          >
            사용법
          </Link>
          <Link
            href="/patch-notes"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
          >
            패치노트
          </Link>
          <Link
            href="/suggestions"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
          >
            건의사항
          </Link>
          <div className="my-1 border-t border-[var(--rm-border)]" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-[var(--rm-danger)] hover:bg-[var(--rm-error-bg)]"
            >
              로그아웃
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
