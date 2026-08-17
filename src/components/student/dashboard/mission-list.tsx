"use client";

import { IconStudy } from "@/components/ui/icons";
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
  /** md 이상에서 옆 카드와 높이 맞춤 */
  fillHeight?: boolean;
};

/** 과목별 개수 안내 — 시작 CTA는 PrimaryActions에만 */
export function MissionList({
  todayCount,
  missions,
  loading,
  fillHeight,
}: Props) {
  return (
    <section
      className={`rm-glass rm-glass--compact ${
        fillHeight ? "flex h-full min-h-0 flex-col" : ""
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="rm-label">오늘 과목별</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--rm-text)]">
            {loading
              ? "불러오는 중…"
              : todayCount > 0
                ? `${todayCount}${UI_LABELS.todayQueueUnit} · 위에서 「다시 풀기」`
                : "오늘 할 문제 없음"}
          </p>
        </div>
        <span className="rm-icon-wrap rm-icon-wrap--active h-8 w-8 shrink-0">
          <IconStudy size={16} />
        </span>
      </div>

      {!loading && missions.length > 0 ? (
        <ul className="mt-2 min-h-0 flex-1 divide-y divide-[var(--rm-border)] overflow-y-auto rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]">
          {missions.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 px-3 py-2.5"
            >
              <span className="text-sm font-medium text-[var(--rm-text)]">
                {m.name}
              </span>
              <span className="rm-mission-badge">{m.count}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && todayCount === 0 ? (
        <div
          className={`mt-2 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-6 text-center ${
            fillHeight ? "min-h-[10rem]" : ""
          }`}
        >
          <p className="text-xs text-[var(--rm-text-muted)]">
            예정된 문제가 없어요.
          </p>
          <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
            「{UI_LABELS.registerCtaTitle}」으로 새 오답을 올려 보세요.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div
          className={`mt-2 flex-1 rounded-xl bg-[var(--rm-bg-elevated)] ${
            fillHeight ? "min-h-[10rem]" : "min-h-[4rem]"
          }`}
        />
      ) : null}
    </section>
  );
}
