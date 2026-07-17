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
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
      <button
        type="button"
        disabled={pending || currentMode === "admin"}
        className={`rounded-full px-2.5 py-1 font-semibold transition ${
          currentMode === "admin"
            ? "bg-blue-600 text-white"
            : "text-slate-600 hover:bg-white"
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
        className={`rounded-full px-2.5 py-1 font-semibold transition ${
          currentMode === "teacher"
            ? "bg-violet-600 text-white"
            : "text-slate-600 hover:bg-white"
        } disabled:opacity-60`}
        onClick={() => {
          startTransition(() => {
            void switchStaffModeAction("teacher");
          });
        }}
      >
        원장/선생님
      </button>
    </div>
  );
}
