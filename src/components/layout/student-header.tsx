"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="min-w-0 shrink">
          <RemindLogo href="/dashboard" size="sm" />
        </div>

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

        <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1">
          <InstallAppPrompt variant="chip" />

          <Link
            href="/account"
            prefetch={false}
            aria-label="계정 · 비밀번호"
            title="계정"
            className={`rm-nav-item inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-auto sm:w-auto sm:rounded-xl sm:px-2.5 sm:py-2 sm:font-semibold ${
              pathname.startsWith("/account")
                ? "rm-nav-item--active"
                : "hover:bg-[var(--rm-surface)]"
            }`}
          >
            <span className="sm:hidden">{initial}</span>
            <span className="hidden sm:inline">계정</span>
          </Link>

          <Link
            href="/subjects"
            prefetch={false}
            aria-label="과목 설정"
            className={`rm-nav-item inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition md:hidden ${
              pathname.startsWith("/subjects")
                ? "rm-nav-item--active"
                : "hover:bg-[var(--rm-surface)]"
            }`}
          >
            <IconSettings size={18} />
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

          <div className="hidden items-center gap-2 lg:flex">
            <span className="max-w-[8rem] truncate text-sm font-medium text-[var(--rm-text)]">
              {userName}
            </span>
          </div>

          <LogoutButton compact />
        </div>
      </div>
    </header>
  );
}
