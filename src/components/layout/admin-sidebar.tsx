"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemsForRole } from "@/lib/constants/admin-nav";
import type { UserRole } from "@/types/user";

type Props = {
  role: UserRole;
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
                prefetch={false}
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

export function AdminMobileNav({ role }: Props) {
  const pathname = usePathname();
  const links = navItemsForRole(role);

  return (
    <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
              active
                ? "bg-[linear-gradient(135deg,var(--rm-brand-violet)_0%,var(--rm-brand)_100%)] text-white"
                : "bg-[var(--rm-accent-muted)] text-[var(--rm-text-muted)]"
            }`}
          >
            {link.shortLabel ?? link.label}
          </Link>
        );
      })}
    </nav>
  );
}
