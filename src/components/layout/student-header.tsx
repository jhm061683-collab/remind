"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { HelpButton } from "@/components/layout/help-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  IconAlert,
  IconArchive,
  IconHome,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

const navItems = [
  { href: "/dashboard", label: "홈", Icon: IconHome, tourId: "student-nav-home" },
  { href: "/upload", label: UI_LABELS.registerTab, Icon: IconPlusPhoto, tourId: "student-nav-register" },
  { href: "/study/today", label: UI_LABELS.studyTab, Icon: IconStudy, tourId: "student-nav-study" },
  { href: "/archive", label: UI_LABELS.archiveTab, Icon: IconArchive, tourId: "student-nav-archive" },
] as const;

type Props = {
  userName: string;
  unreadNotifications?: number;
};

export function StudentHeader({ userName, unreadNotifications = 0 }: Props) {
  const pathname = usePathname();

  return (
    <header className="student-shell-header rm-header sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="min-w-0 shrink">
          <RemindLogo href="/dashboard" size="sm" />
        </div>

        <nav className="hidden flex-1 justify-center md:flex">
          <ul className="inline-flex items-center gap-1" data-tour-id="student-nav">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-tour-id={item.tourId}
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
          <Link
            href="/notifications"
            aria-label="알림"
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
              pathname.startsWith("/notifications")
                ? "bg-[var(--rm-accent-soft,rgba(37,99,235,0.12))] text-[var(--rm-accent,#2563eb)]"
                : "text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface)]"
            }`}
          >
            <IconAlert size={18} />
            {unreadNotifications > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
          <InstallAppPrompt variant="chip" />
          <HelpButton />
          <ThemeToggle />
          <AccountMenu userName={userName} />
        </div>
      </div>
    </header>
  );
}
