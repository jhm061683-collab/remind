"use client";

import Link from "next/link";
import { IconChevronRight, IconStudy } from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

type Mission = {
  id: string;
  name: string;
  count: number;
};

type Props = {
  todayCount: number;
  missions: Mission[];
  loading?: boolean;
};

export function MissionList({ todayCount, missions, loading }: Props) {
  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="rm-label">오늘의 미션</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--rm-text)]">
            {loading
              ? "불러오는 중…"
              : todayCount > 0
                ? `${todayCount}${UI_LABELS.todayQueueUnit} 정리하기`
                : "오늘은 쉬는 날"}
          </p>
        </div>
        <span className="rm-icon-wrap rm-icon-wrap--active h-8 w-8 shrink-0">
          <IconStudy size={16} />
        </span>
      </div>

      {!loading && missions.length > 0 ? (
        <ul className="mt-2 divide-y divide-[var(--rm-border)] overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]">
          {missions.map((m) => (
            <li key={m.id}>
              <Link
                href="/study/today"
                className="rm-mission-item group rounded-none border-0 bg-transparent"
              >
                <span className="text-sm font-medium text-[var(--rm-text)]">
                  {m.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="rm-mission-badge">{m.count}</span>
                  <IconChevronRight
                    size={14}
                    className="text-[var(--rm-text-subtle)] transition group-hover:text-[var(--rm-nav-active)]"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && todayCount === 0 ? (
        <p className="mt-2 text-center text-xs text-[var(--rm-text-muted)]">
          예정된 문제가 없어요. 사진 올리기로 새 오답을 등록해 보세요.
        </p>
      ) : null}
    </section>
  );
}
