"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveBackNavigation } from "@/lib/navigation/back-navigation";

type Props = {
  href: string;
  label?: string;
};

export function BackBar({ href, label = "뒤로" }: Props) {
  const router = useRouter();

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof window === "undefined") return;

    const action = resolveBackNavigation({
      fallbackHref: href,
      referrer: document.referrer || null,
      historyLength: window.history.length,
      origin: window.location.origin,
    });

    if (action === "href") return;

    event.preventDefault();
    router.back();
  }

  return (
    <div className="mb-4 md:mb-5">
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold text-[var(--rm-nav-active)] transition active:bg-[var(--rm-info-bg)] touch-manipulation"
      >
        <span aria-hidden className="text-lg leading-none">
          ‹
        </span>
        {label}
      </Link>
    </div>
  );
}
