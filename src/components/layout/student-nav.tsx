"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav className="student-shell-nav rm-bottom-nav fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch={false}
                className={`rm-bottom-nav-link flex flex-col items-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition ${
                  active ? "rm-bottom-nav-link--active" : ""
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center">
                  <item.Icon size={22} className="rm-bottom-nav-icon" />
                </span>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
