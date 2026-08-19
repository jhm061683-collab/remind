"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevronRight, IconList } from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { getPhaseHint, getPhaseLabel } from "@/lib/utils/labels";
import type { ReviewPhase } from "@/types/subject";

export type ForgettingFeedItem = {
  id: string;
  subjectName: string;
  source?: string | null;
  phase: string;
};

type Props = {
  items: ForgettingFeedItem[];
  streak: number;
  conqueredCount: number;
  loading?: boolean;
};

/** 오늘 목록 미리보기 — 큰 CTA는 PrimaryActions에만 */
export function ForgettingCurveFeed({
  items,
  streak,
  conqueredCount,
  loading,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="rm-label flex items-center gap-1.5">
            <IconList size={14} className="text-[var(--rm-brand-violet)]" />
            오늘 목록
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--rm-text)]">
            {loading
              ? "불러오는 중…"
              : items.length > 0
                ? `${items.length}${UI_LABELS.todayQueueUnit} 미리보기`
                : "오늘은 예정된 문제가 없어요"}
          </p>
        </div>
        {!loading ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="student-today-list"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-bold text-[var(--rm-nav-active)]"
          >
            {expanded ? "접기" : "펼쳐보기"}
            <IconChevronRight size={12} className={`transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`} />
          </button>
        ) : null}
      </div>

      <div id="student-today-list" hidden={!expanded}>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-1 text-[11px] font-bold text-[var(--rm-text)]">
          연속 {loading ? "—" : streak}일
        </span>
        <span className="rounded-full border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-1 text-[11px] font-bold text-[var(--rm-text)]">
          보관 완료 {loading ? "—" : conqueredCount}개
        </span>
      </div>

      {!loading && items.length > 0 ? (
        <ul className="mt-2 divide-y divide-[var(--rm-border)] overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]">
          {items.slice(0, 4).map((item) => {
            const phase = item.phase as ReviewPhase;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--rm-text)]">
                    {item.subjectName}
                    {item.source ? (
                      <span className="text-[var(--rm-text-muted)]">
                        {" "}
                        · {item.source}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[10px] font-semibold text-[var(--rm-text-subtle)]">
                    {getPhaseLabel(phase)} · {getPhaseHint(phase)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!loading && items.length > 4 ? (
        <p className="mt-2 text-center text-xs text-[var(--rm-text-muted)]">
          외 {items.length - 4}개 · 위 「다시 풀기」에서 이어서
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="mt-2 text-center text-xs text-[var(--rm-text-muted)]">
          등록한 문제는 일정에 맞춰 여기에 모여요.
        </p>
      ) : null}
      {!loading && items.length > 0 ? (
        <Link
          href="/study/today"
          className="mt-2 flex min-h-[44px] items-center justify-center text-xs font-bold text-[var(--rm-nav-active)]"
        >
          다시 풀기
          <IconChevronRight size={12} className="ml-0.5" />
        </Link>
      ) : null}
      </div>
    </section>
  );
}
