"use client";

import { IconFlame } from "@/components/ui/icons";

type Props = {
  streak: number;
  longestStreak: number;
  weeklyDone: number;
  weeklyGoal?: number;
  loading?: boolean;
};

export function StreakProgressCard({
  streak,
  longestStreak,
  weeklyDone,
  weeklyGoal = 7,
  loading,
}: Props) {
  const pct = Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100));
  const ringOffset = 283 - (283 * pct) / 100;

  return (
    <div className="rm-glass rm-glass--glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rm-label">출석 · 연속 학습</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--rm-text)]">
            {loading ? "—" : streak}
            <span className="ml-1 text-sm font-semibold text-[var(--rm-text-muted)]">
              일
            </span>
          </p>
          <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
            최고 기록 {loading ? "—" : longestStreak}일
          </p>
        </div>

        <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center">
          <svg className="-rotate-90" width="72" height="72" aria-hidden>
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
            />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="url(#rm-ring-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={loading ? 283 : ringOffset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            <defs>
              <linearGradient id="rm-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--rm-brand)" />
                <stop offset="100%" stopColor="var(--rm-brand-dark)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute flex flex-col items-center">
            <IconFlame size={16} className="text-[var(--rm-accent-bright)]" />
            <span className="text-[10px] font-bold tabular-nums text-[var(--rm-text-muted)]">
              {loading ? "—" : `${pct}%`}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-[var(--rm-text-muted)]">
          <span>이번 주 진도</span>
          <span className="tabular-nums">
            {loading ? "—" : `${weeklyDone} / ${weeklyGoal}일`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--rm-brand)] to-[var(--rm-brand-dark)] transition-all duration-700 ease-out"
            style={{ width: loading ? "0%" : `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
