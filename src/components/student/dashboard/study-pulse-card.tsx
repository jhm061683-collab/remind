"use client";

import {
  IconArchive,
  IconFlame,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import type { WeeklyReport } from "@/lib/data/user-stats";

type Props = {
  streak: number;
  longestStreak: number;
  weeklyDone: number;
  weeklyGoal?: number;
  weekly: WeeklyReport | null;
  totalReviews: number;
  loading?: boolean;
};

type Metric = {
  key: string;
  label: string;
  value: number;
  color: string;
  Icon: typeof IconPlusPhoto;
};

/** 출석 + 주간 활동을 한 카드로 — 세로 여백을 줄이는 홈 구성용 */
export function StudyPulseCard({
  streak,
  longestStreak,
  weeklyDone,
  weeklyGoal = 7,
  weekly,
  totalReviews,
  loading,
}: Props) {
  const pct = Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100));
  const metrics: Metric[] = [
    {
      key: "registered",
      label: "등록",
      value: weekly?.registered ?? 0,
      color: "var(--rm-brand)",
      Icon: IconPlusPhoto,
    },
    {
      key: "reviewed",
      label: "다시 풀기",
      value: weekly?.reviewed ?? 0,
      color: "var(--rm-brand-bright)",
      Icon: IconStudy,
    },
    {
      key: "archived",
      label: "정복",
      value: weekly?.archived ?? 0,
      color: "var(--rm-success)",
      Icon: IconArchive,
    },
  ];
  const peak = Math.max(1, ...metrics.map((m) => m.value));

  return (
    <section className="rm-glass rm-glass--compact rm-pulse">
      <div className="rm-pulse__top">
        <div className="min-w-0">
          <p className="rm-label flex items-center gap-1.5">
            <IconFlame size={12} className="text-[var(--rm-accent-bright)]" />
            출석 · 연속
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tabular-nums tracking-tight text-[var(--rm-text)]">
              {loading ? "—" : streak}
            </span>
            <span className="text-xs font-semibold text-[var(--rm-text-muted)]">
              일
            </span>
            <span className="text-[11px] text-[var(--rm-text-faint)]">
              최고 {loading ? "—" : longestStreak}일
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--rm-text-muted)]">누적 복습</p>
          <p className="text-base font-bold tabular-nums text-[var(--rm-accent-bright)]">
            {loading ? "—" : totalReviews}
          </p>
        </div>
      </div>

      <div className="rm-pulse__week">
        <div className="mb-1 flex justify-between text-[10px] text-[var(--rm-text-muted)]">
          <span>이번 주 {loading ? "" : weekly?.weekLabel ?? ""}</span>
          <span className="tabular-nums">
            {loading ? "—" : `${weeklyDone}/${weeklyGoal}일 · ${pct}%`}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--rm-text)_8%,transparent)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--rm-brand-violet)] to-[var(--rm-brand)] transition-all duration-700 ease-out"
            style={{ width: loading ? "0%" : `${pct}%` }}
          />
        </div>
      </div>

      <div className="rm-pulse__meters">
        {metrics.map((metric) => {
          const bar = loading ? 0 : (metric.value / peak) * 100;
          return (
            <div key={metric.key} className="rm-pulse__meter">
              <span className="rm-pulse__meter-label">
                <metric.Icon size={12} />
                {metric.label}
              </span>
              <div className="rm-pulse__meter-track">
                <div
                  className="rm-pulse__meter-fill"
                  style={{
                    width: `${bar}%`,
                    background: metric.color,
                  }}
                />
              </div>
              <span className="rm-pulse__meter-value tabular-nums">
                {loading ? "—" : metric.value}
              </span>
            </div>
          );
        })}
      </div>

      {!loading && weekly?.topWeakness ? (
        <p className="rm-pulse__weak">
          약점{" "}
          <span className="font-semibold text-[var(--rm-warning)]">
            {weekly.topWeakness}
          </span>
        </p>
      ) : null}
    </section>
  );
}
