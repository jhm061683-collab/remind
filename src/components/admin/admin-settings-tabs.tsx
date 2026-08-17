"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  param?: string;
  defaultTab: string;
};

export function AdminSettingsTabs({
  tabs,
  param = "tab",
  defaultTab,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(param) || defaultTab;

  function select(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(param, id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => select(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              isActive
                ? "bg-[var(--rm-brand)] text-white shadow-sm"
                : "text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminSettingsTabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-[var(--rm-brand)] text-white shadow-sm"
          : "text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
      }`}
    >
      {label}
    </Link>
  );
}
