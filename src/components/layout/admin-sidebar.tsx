"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconAlert,
  IconChart,
  IconLayers,
  IconList,
  IconSettings,
} from "@/components/ui/icons";
import { navItemsForRole } from "@/lib/constants/admin-nav";
import type { UserRole } from "@/types/user";

type Props = {
  role: UserRole;
};

type IconComp = ComponentType<{ className?: string; size?: number }>;

const NAV_ICONS: Record<string, IconComp> = {
  "/admin/dashboard": IconChart,
  "/admin/students": IconList,
  "/admin/classes": IconLayers,
  "/admin/sub-admins": IconSettings,
  "/admin/notifications": IconAlert,
};

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname();
  const links = navItemsForRole(role);

  return (
    <aside className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] hidden h-[calc(100dvh-2.75rem-env(safe-area-inset-top))] w-44 shrink-0 self-start overflow-y-auto border-r border-[var(--rm-border)] bg-[color-mix(in_srgb,var(--rm-surface)_72%,transparent)] p-2 backdrop-blur-xl md:block">
      <ul className="space-y-0.5 pt-1">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[linear-gradient(135deg,var(--rm-brand-violet)_0%,var(--rm-brand)_100%)] text-white shadow-sm shadow-[var(--rm-accent-glow)]"
                    : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-accent-muted)] hover:text-[var(--rm-text)]"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** 모바일 전용 하단 탭바 — md 미만에서만 표시 (CSS only) */
export function AdminMobileNav({ role }: Props) {
  const pathname = usePathname();
  const links = navItemsForRole(role);

  return (
    <nav
      className="rm-bottom-nav fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md md:hidden"
      aria-label="관리자 메뉴"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.125rem,env(safe-area-inset-bottom))] pt-0.5">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = NAV_ICONS[link.href] ?? IconList;
          return (
            <li key={link.href} className="min-w-0 flex-1">
              <Link
                href={link.href}
                className={`rm-bottom-nav-link flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold touch-manipulation transition ${
                  active ? "rm-bottom-nav-link--active" : ""
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  <Icon size={20} className="rm-bottom-nav-icon" />
                </span>
                <span className="max-w-full truncate leading-tight">
                  {link.shortLabel ?? link.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
