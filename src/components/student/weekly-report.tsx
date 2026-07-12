"use client";

import {
  IconArchive,
  IconChart,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import type { WeeklyReport } from "@/lib/data/user-stats";
import { UI_LABELS } from "@/lib/constants/ui-labels";

type Props = {
  weekly: WeeklyReport;
  compact?: boolean;
};

export function WeeklyReportSection({ weekly, compact = false }: Props) {
  return (
    <section className="remind-card rm-weekly-report overflow-hidden">
      <div className="rm-weekly-header">
        <span className="rm-icon-wrap h-8 w-8 shrink-0">
          <IconChart size={16} />
        </span>
        <div>
          <p className="text-sm font-bold">{UI_LABELS.weeklyReport}</p>
          <p className="text-[11px] opacity-80">{weekly.weekLabel}</p>
        </div>
      </div>

      <div className="rm-weekly-stats">
        <WeekStat
          icon={<IconPlusPhoto size={14} />}
          label={UI_LABELS.weekRegistered}
          value={weekly.registered}
        />
        <WeekStat
          icon={<IconStudy size={14} />}
          label={UI_LABELS.weekStudied}
          value={weekly.reviewed}
        />
        <WeekStat
          icon={<IconArchive size={14} />}
          label={UI_LABELS.weekArchived}
          value={weekly.archived}
        />
      </div>

      {weekly.topWeakness ? (
        <div className="rm-weekly-weakness">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--rm-warning)]">
            TOP 약점
          </p>
          <p className="mt-0.5 text-sm font-bold">{weekly.topWeakness}</p>
        </div>
      ) : null}

      {weekly.insight ? (
        <div className="rm-weekly-insight">
          <p className="text-xs font-medium">{weekly.insight}</p>
        </div>
      ) : null}

      {!compact && weekly.trends.length > 0 ? (
        <div className="rm-weekly-trends">
          <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
            틀린 이유
          </p>
          <ul className="mt-2 space-y-2">
            {weekly.trends.slice(0, 5).map((t) => (
              <li key={t.reason} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 truncate text-xs font-medium">
                  {t.reason}
                </span>
                <div className="rm-weekly-trend-bar">
                  <div
                    className="rm-weekly-trend-bar__fill"
                    style={{
                      width: `${Math.min(100, (t.thisWeek / Math.max(t.thisWeek, t.lastWeek, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-[10px] font-semibold text-[var(--rm-text-muted)]">
                  {t.thisWeek}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weekly.registered === 0 &&
      weekly.reviewed === 0 &&
      weekly.archived === 0 ? (
        <p className="border-t border-[var(--rm-border)] px-4 py-3 text-center text-xs text-[var(--rm-text-muted)]">
          이번 주 활동이 없어요
        </p>
      ) : null}
    </section>
  );
}

function WeekStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rm-weekly-stat">
      <span className="rm-weekly-stat__icon">{icon}</span>
      <p className="rm-weekly-stat__label">{label}</p>
      <p className="rm-weekly-stat__value">{value}</p>
    </div>
  );
}
