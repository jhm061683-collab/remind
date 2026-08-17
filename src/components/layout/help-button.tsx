"use client";

import { useRouter } from "next/navigation";

/** 헤더 ? → 사용법 페이지 (온보딩과 내용이 갈라지지 않게) */
export function HelpButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      data-tour-id="student-help"
      aria-label="사용법 보기"
      title="사용법 보기"
      onClick={() => router.push("/help")}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--rm-text-muted)] transition hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M9.5 9.2a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 2-2.1 3.3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    </button>
  );
}
