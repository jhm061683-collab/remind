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
    <aside className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] hidden h-[calc(100dvh-2.75rem-env(safe-area-inset-top))] w-48 shrink-0 self-start overflow-y-auto border-r border-slate-200/70 bg-white/80 p-2.5 backdrop-blur-sm md:block">
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
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {link.shortLabel ?? link.label}
          </Link>
        );
      })}
    </nav>
  );
}
