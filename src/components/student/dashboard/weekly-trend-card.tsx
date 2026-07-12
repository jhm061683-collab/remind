"use client";

import {
  IconArchive,
  IconChart,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import type { WeeklyReport } from "@/lib/data/user-stats";

type Props = {
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

export function WeeklyTrendCard({ weekly, totalReviews, loading }: Props) {
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
    <div className="rm-glass">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rm-icon-wrap h-8 w-8">
            <IconChart size={16} />
          </span>
          <div>
            <p className="rm-label">이번 주 활동</p>
            <p className="text-sm font-semibold text-[var(--rm-text)]">
              {loading ? "—" : weekly?.weekLabel ?? "이번 주"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--rm-text-muted)]">누적 다시 풀기</p>
          <p className="text-lg font-bold tabular-nums text-[var(--rm-accent-bright)]">
            {loading ? "—" : totalReviews}
          </p>
        </div>
      </div>

      <div className="rm-trend-meters mt-4">
        {metrics.map((metric) => {
          const pct = loading ? 0 : (metric.value / peak) * 100;

          return (
            <div key={metric.key} className="rm-trend-meter">
              <div className="rm-trend-meter__head">
                <span className="rm-trend-meter__label">
                  <metric.Icon size={14} className="text-[var(--rm-text-muted)]" />
                  {metric.label}
                </span>
                <span className="rm-trend-meter__value tabular-nums">
                  {loading ? "—" : metric.value}
                </span>
              </div>
              <div className="rm-trend-meter__track">
                <div
                  className="rm-trend-meter__fill"
                  style={{
                    width: loading ? "0%" : `${pct}%`,
                    background: `linear-gradient(90deg, ${metric.color} 0%, color-mix(in srgb, ${metric.color} 55%, transparent) 100%)`,
                    boxShadow:
                      metric.value > 0
                        ? `0 0 10px color-mix(in srgb, ${metric.color} 30%, transparent)`
                        : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!loading && weekly?.topWeakness ? (
        <p className="mt-4 rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2.5 text-xs text-[var(--rm-text-muted)]">
          약점 포인트{" "}
          <span className="font-semibold text-[var(--rm-warning)]">
            {weekly.topWeakness}
          </span>
        </p>
      ) : null}
    </div>
  );
}
