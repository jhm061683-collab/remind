import Link from "next/link";
import type { UserRole } from "@/types/user";
import { navItemsForRole } from "@/lib/constants/admin-nav";

type Props = {
  role: UserRole;
};

export function AdminSidebar({ role }: Props) {
  const links = navItemsForRole(role);
  const title = role === "sub_admin" ? "서브관리자" : "관리자";

  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white p-4 md:block">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function AdminMobileNav({ role }: Props) {
  const links = navItemsForRole(role).slice(0, 3);

  return (
    <nav className="flex flex-wrap gap-2 text-xs">
      {links.map((link) => (
        <Link key={link.href} href={link.href} prefetch={false} className="text-blue-600">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
