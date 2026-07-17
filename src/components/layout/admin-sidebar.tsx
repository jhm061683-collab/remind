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
    <aside className="sticky top-[3.25rem] hidden h-[calc(100dvh-3.25rem)] w-60 shrink-0 self-start overflow-y-auto border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-4 md:block">
      <div className="mb-5 px-1">
        <RemindLogo href="/admin/dashboard" size="sm" />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {roleLabel} 모드
        </p>
      </div>
      <ul className="space-y-1">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
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
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              active
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
