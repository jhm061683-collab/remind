"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { switchViewScopeAction } from "@/lib/auth/actions";
import { parseViewScope, type StaffViewScope } from "@/lib/auth/staff-mode";

type Props = {
  currentScope: StaffViewScope;
};

export function StaffModeSwitch({ currentScope }: Props) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlScope = parseViewScope(searchParams.get("scope"));
  const activeScope = urlScope ?? currentScope;

  function select(scope: StaffViewScope) {
    if (pending || scope === activeScope) return;
    startTransition(async () => {
      const res = await switchViewScopeAction(scope);
      if (res?.error) return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("scope", scope);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="보기 범위"
      className="flex items-center gap-0.5 rounded-full border border-[var(--rm-border)] bg-[var(--rm-accent-muted)] p-0.5 text-[11px]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={activeScope === "academy"}
        aria-pressed={activeScope === "academy"}
        disabled={pending}
        className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold transition ${
          activeScope === "academy"
            ? "bg-[var(--rm-brand)] text-white"
            : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
        } disabled:opacity-60`}
        onClick={() => select("academy")}
      >
        학원 전체
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={activeScope === "assigned"}
        aria-pressed={activeScope === "assigned"}
        disabled={pending}
        className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold transition ${
          activeScope === "assigned"
            ? "bg-[var(--rm-brand-violet)] text-white"
            : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
        } disabled:opacity-60`}
        onClick={() => select("assigned")}
      >
        내 담당
      </button>
    </div>
  );
}
