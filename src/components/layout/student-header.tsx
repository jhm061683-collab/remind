"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { HelpButton } from "@/components/layout/help-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  IconArchive,
  IconHome,
  IconPlusPhoto,
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
          <HelpButton />
          <ThemeToggle />
          <AccountMenu userName={userName} />
        </div>
      </div>
    </header>
  );
}
