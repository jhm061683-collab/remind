"use client";

import Link from "next/link";
import { IconPlusPhoto, IconStudy } from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

type Props = {
  todayCount: number;
  overdueCount: number;
  doneToday: number;
  targetToday: number;
  loading?: boolean;
};

export function TodayFocusHero({
  todayCount,
  overdueCount,
  doneToday,
  targetToday,
  loading,
}: Props) {
  const hasWork = !loading && todayCount > 0;
  const allDone = !loading && todayCount === 0 && doneToday > 0;
  const empty = !loading && todayCount === 0 && doneToday === 0;

  return (
    <section
      data-tour-id="student-today-hero"
      className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-[var(--rm-shadow-soft)]"
    >
      <p className="text-[11px] font-bold tracking-wide text-[var(--rm-text-muted)]">
        지금 할 일
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <FocusStat
          label="오늘 복습"
          value={loading ? "—" : todayCount}
          emphasis={hasWork}
        />
        <FocusStat
          label="밀린 복습"
          value={loading ? "—" : overdueCount}
          warn={!loading && overdueCount > 0}
        />
        <FocusStat
          label="오늘 완료"
          value={
            loading
              ? "—"
              : `${doneToday}${targetToday > 0 ? ` / ${targetToday}` : ""}`
          }
        />
      </div>

      <Link
        href="/study/today"
        data-tour-id="student-study-start"
        className={`mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-bold touch-manipulation transition ${
          hasWork
            ? "bg-[var(--rm-brand)] text-white shadow-sm"
            : "border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text)]"
        }`}
      >
        <IconStudy size={20} />
        {loading
          ? "불러오는 중…"
          : hasWork
            ? `오늘 복습 시작 · ${todayCount}문제`
            : allDone
              ? "오늘 복습 완료 · 기록 보기"
              : UI_LABELS.todayQueueEmptyCta}
      </Link>

      {allDone ? (
        <p className="mt-2 text-center text-xs font-medium text-[var(--rm-success)]">
          오늘 예정된 복습을 모두 완료했습니다
        </p>
      ) : null}
      {empty ? (
        <p className="mt-2 text-center text-xs text-[var(--rm-text-muted)]">
          아직 오늘 할 복습이 없어요. 오답을 등록해 보세요.
        </p>
      ) : null}

      <Link
        href="/upload"
        className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--rm-border)] text-sm font-semibold text-[var(--rm-text)] touch-manipulation"
      >
        <IconPlusPhoto size={16} />
        오답 등록
      </Link>
    </section>
  );
}

function FocusStat({
  label,
  value,
  emphasis,
  warn,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--rm-surface-raised)] px-2 py-2.5 text-center">
      <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-xl font-bold tabular-nums ${
          warn
            ? "text-[var(--rm-warning)]"
            : emphasis
              ? "text-[var(--rm-brand-bright)]"
              : "text-[var(--rm-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
