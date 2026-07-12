"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  IconArchive,
  IconHome,
  IconPlusPhoto,
  IconSettings,
  IconStudy,
} from "@/components/ui/icons";

import { UI_LABELS } from "@/lib/constants/ui-labels";

const navItems = [
  { href: "/dashboard", label: "홈", Icon: IconHome },
  { href: "/upload", label: UI_LABELS.registerTab, Icon: IconPlusPhoto },
  { href: "/study/today", label: UI_LABELS.studyTab, Icon: IconStudy },
  { href: "/archive", label: "보관", Icon: IconArchive },
] as const;

type Props = {
  userName: string;
};

export function StudentHeader({ userName }: Props) {
  const pathname = usePathname();
  const initial = userName.charAt(0) || "학";

  return (
    <header className="student-shell-header rm-header sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <RemindLogo href="/dashboard" size="sm" />

        <nav className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`rm-nav-item flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "rm-nav-item--active"
                        : "hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
                    }`}
                  >
                    <item.Icon size={16} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/subjects"
            prefetch={false}
            aria-label="과목 설정"
            className={`rm-nav-item rounded-xl p-2 transition md:hidden ${
              pathname.startsWith("/subjects")
                ? "rm-nav-item--active"
                : "hover:bg-[var(--rm-surface)]"
            }`}
          >
            <IconSettings size={20} />
          </Link>

          <Link
            href="/subjects"
            prefetch={false}
            className={`rm-nav-item hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition md:flex ${
              pathname.startsWith("/subjects")
                ? "rm-nav-item--active"
                : "hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
            }`}
          >
            <IconSettings size={16} />
            설정
          </Link>

          <ThemeToggle />

          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--rm-accent-muted)] text-sm font-bold text-[var(--rm-accent-bright)]">
              {initial}
            </span>
            <span className="max-w-[8rem] truncate text-sm font-medium text-[var(--rm-text)]">
              {userName}
            </span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
