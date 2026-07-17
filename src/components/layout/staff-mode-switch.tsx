"use client";

import { useTransition } from "react";
import { switchStaffModeAction } from "@/lib/auth/actions";
import type { StaffMode } from "@/lib/auth/staff-mode";

type Props = {
  currentMode: StaffMode;
};

export function StaffModeSwitch({ currentMode }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[var(--rm-border)] bg-[var(--rm-accent-muted)] p-0.5 text-[11px]">
      <button
        type="button"
        disabled={pending || currentMode === "admin"}
        className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold transition ${
          currentMode === "admin"
            ? "bg-[var(--rm-brand)] text-white shadow-sm"
            : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
        } disabled:opacity-60`}
        onClick={() => {
          startTransition(() => {
            void switchStaffModeAction("admin");
          });
        }}
      >
        관리자
      </button>
      <button
        type="button"
        disabled={pending || currentMode === "teacher"}
        className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold transition ${
          currentMode === "teacher"
            ? "bg-[var(--rm-brand-violet)] text-white shadow-sm"
            : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
        } disabled:opacity-60`}
        onClick={() => {
          startTransition(() => {
            void switchStaffModeAction("teacher");
          });
        }}
      >
        선생님
      </button>
    </div>
  );
}
