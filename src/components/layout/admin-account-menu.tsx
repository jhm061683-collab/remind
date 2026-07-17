"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

type Props = {
  userName: string;
  showSuggestions?: boolean;
};

export function AdminAccountMenu({
  userName,
  showSuggestions = false,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const initial = userName.replace(/원장님?$/u, "").charAt(0) || "관";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex max-w-[10.5rem] items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-semibold transition sm:max-w-[12rem] sm:px-2.5 sm:py-1.5 ${
          open
            ? "border-[var(--rm-border-glow)] bg-[var(--rm-accent-muted)] text-[var(--rm-text)]"
            : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)] hover:border-[var(--rm-border-glow)] hover:bg-[var(--rm-accent-muted)]"
        }`}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "var(--rm-logo-gradient)" }}
        >
          {initial}
        </span>
        <span className="truncate">{userName}</span>
        <span className="text-[10px] text-[var(--rm-text-faint)]" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] py-1 shadow-lg shadow-[var(--rm-shadow-soft)]"
        >
          <Link
            href="/admin/account"
            role="menuitem"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-accent-muted)]"
          >
            계정 설정
          </Link>
          {showSuggestions ? (
            <Link
              href="/admin/suggestions"
              role="menuitem"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2.5 text-sm font-medium text-[var(--rm-text)] hover:bg-[var(--rm-accent-muted)]"
            >
              건의사항
            </Link>
          ) : null}
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
