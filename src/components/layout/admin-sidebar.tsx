"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RemindLogo } from "@/components/brand/remind-logo";
import { navItemsForRole } from "@/lib/constants/admin-nav";
import type { UserRole } from "@/types/user";

type Props = {
  role: UserRole;
};

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname();
  const links = navItemsForRole(role);
  const roleLabel = role === "sub_admin" ? "서브관리자" : "관리자";

  return (
    <aside className="sticky top-[3.25rem] hidden h-[calc(100dvh-3.25rem)] w-52 shrink-0 self-start overflow-y-auto border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-3 md:block">
      <div className="mb-3 px-1">
        <RemindLogo href="/admin/dashboard" size="sm" />
        <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
          {roleLabel}
        </p>
      </div>
      <ul className="space-y-0.5">
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
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                    : "text-slate-700 hover:bg-slate-100"
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
