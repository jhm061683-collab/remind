"use client";

import { UI_LABELS } from "@/lib/constants/ui-labels";
import type { StudentRankCard } from "@/lib/server/rankings";

type Props = {
  todayCount: number;
  upcomingCount: number;
  conqueredCount: number;
  rank: StudentRankCard | null;
  loading?: boolean;
  fillHeight?: boolean;
};

/** 현황 카드 — 다시 풀기 CTA는 PrimaryActions에만 */
export function HomeSideBoost({
  todayCount,
  upcomingCount,
  conqueredCount,
  rank,
  loading,
  fillHeight,
}: Props) {
  const levelLabel =
    rank?.schoolLevel === "middle"
      ? "중등부"
      : rank?.schoolLevel === "high"
        ? "고등부"
        : null;

  const hasStudyScore = rank != null && typeof rank.studyScore === "number";
  const classLabel =
    rank?.classRanks?.[0]?.displayLabel ||
    rank?.className ||
    null;
  const teachers = rank?.classRanks?.[0]?.teacherNames?.join(", ") ?? "";

  return (
    <section
      className={`rm-glass rm-glass--compact flex flex-col gap-2.5 ${
        fillHeight ? "h-full min-h-0" : ""
      }`}
    >
      <div className="shrink-0">
        <p className="rm-label">내 현황</p>
        {loading ? (
          <p className="mt-1 text-sm text-[var(--rm-text-muted)]">불러오는 중…</p>
        ) : todayCount > 0 ? (
          <p className="mt-1 text-sm font-semibold text-[var(--rm-text)]">
            오늘 {todayCount}문제 · 위 「다시 풀기」로 시작
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-[var(--rm-text)]">
            오늘 할 일 끝!
            <span className="mt-0.5 block text-[11px] font-normal text-[var(--rm-text-muted)]">
              {upcomingCount > 0
                ? `앞으로 ${upcomingCount}문제가 기다려요`
                : "새 오답을 등록하면 다시 풀기가 생겨요"}
            </span>
          </p>
        )}
      </div>

      <div
        className={`grid gap-1.5 ${hasStudyScore ? "grid-cols-3" : "grid-cols-2"} ${
          fillHeight ? "mt-auto" : ""
        }`}
      >
        <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
            보관 완료
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-[var(--rm-text)]">
            {loading ? "—" : conqueredCount}
          </p>
        </div>
        {hasStudyScore ? (
          <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-2">
            <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
              학습 점수
            </p>
            <p className="mt-0.5 text-base font-extrabold tabular-nums text-[var(--rm-text)]">
              {loading ? "—" : rank.studyScore}
            </p>
            <p className="mt-0.5 text-[9px] leading-tight text-[var(--rm-text-faint)]">
              {UI_LABELS.studyScoreHint}
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
            {rank ? "학원 순위" : "예정"}
          </p>
          <p className="mt-0.5 text-base font-extrabold tabular-nums text-[var(--rm-text)]">
            {loading
              ? "—"
              : rank
                ? `${rank.academyRank}위`
                : upcomingCount}
            {rank ? (
              <span className="ml-0.5 text-[10px] font-semibold text-[var(--rm-text-faint)]">
                /{rank.academyTotal}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {rank ? (
        <div className="rounded-xl border border-[var(--rm-border)] bg-[color-mix(in_srgb,var(--rm-brand)_6%,var(--rm-surface))] px-2.5 py-2">
          <p className="text-[11px] leading-snug text-[var(--rm-text-muted)]">
            {levelLabel ? (
              <>
                {levelLabel}{" "}
                <span className="font-bold text-[var(--rm-text)]">
                  {rank.levelRank ?? "—"}위
                </span>
              </>
            ) : null}
            {rank.classRank != null ? (
              <>
                {levelLabel ? " · " : ""}
                <span className="font-bold text-[var(--rm-text)]">
                  {classLabel ?? "반"}
                </span>{" "}
                <span className="font-bold text-[var(--rm-text)]">
                  {rank.classRank}위
                </span>
              </>
            ) : null}
            {teachers ? (
              <span className="text-[var(--rm-text-faint)]"> · {teachers}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--rm-text-muted)]">
            이번 달 다시 풀기{" "}
            <span className="font-bold text-[var(--rm-brand)]">
              {rank.monthlyReviews}회
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
