"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  IconArchive,
  IconCheck,
  IconFlame,
  IconList,
  IconStudy,
} from "@/components/ui/icons";
import { getUserStats, type UserStats } from "@/lib/data/user-stats";
import {
  REGISTERED_COUNT_RULE,
  REVIEW_COUNT_RULE,
  STREAK_RULE,
} from "@/lib/constants/stats-rules";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { WeeklyReportSection } from "@/components/student/weekly-report";
import { ShareStatsCard } from "@/components/student/share-stats-card";

type Props = {
  userId: string;
};

export function RecordsOverview({ userId }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    void getUserStats(userId).then(setStats);
  }, [userId]);

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="remind-card h-32 animate-pulse opacity-60" />
        <div className="remind-card h-48 animate-pulse opacity-60" />
      </div>
    );
  }

  const unlocked = stats.achievements.filter((a) => a.unlocked);
  const locked = stats.achievements.filter((a) => !a.unlocked);

  return (
    <div className="space-y-5">
      <section className="rm-rules-panel">
        <p className="rm-rules-panel__title">집계 기준</p>
        <ul className="rm-rules-panel__list">
          <li>등록: {REGISTERED_COUNT_RULE}</li>
          <li>복습: {REVIEW_COUNT_RULE}</li>
          <li>연속: {STREAK_RULE}</li>
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RecordStat
          icon={<IconList size={16} />}
          label="등록한 문제"
          value={stats.totalRegistered}
        />
        <RecordStat
          icon={<IconStudy size={16} />}
          label={UI_LABELS.studyCount}
          value={stats.totalReviews}
        />
        <RecordStat
          icon={<IconArchive size={16} />}
          label="정복한 문제"
          value={stats.totalArchived}
        />
        <RecordStat
          icon={<IconFlame size={16} />}
          label={UI_LABELS.streakLabel}
          value={stats.studyStreak}
          unit="일"
          highlight={stats.studyStreak >= 3}
        />
      </section>

      {stats.longestStreak > 0 ? (
        <p className="text-center text-xs text-[var(--rm-text-muted)]">
          최장 연속 기록 {stats.longestStreak}일
        </p>
      ) : null}

      <section className="remind-card rm-achievements-panel p-4">
        <p className="remind-section-title">업적</p>
        <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
          {unlocked.length}개 달성 · 총 {stats.achievements.length}개
        </p>

        {unlocked.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {unlocked.map((a) => (
              <li key={a.id} className="rm-achievement-unlocked">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs opacity-80">{a.description}</p>
                </div>
                <span className="shrink-0" aria-label="달성">
                  <IconCheck size={22} className="rm-achievement-check" />
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {locked.length > 0 ? (
          <ul className={`space-y-2 ${unlocked.length > 0 ? "mt-3" : "mt-3"}`}>
            {locked.map((a) => (
              <li key={a.id} className="rm-achievement-locked">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
                  {a.description}
                </p>
                <div className="rm-achievement-progress">
                  <div
                    className="rm-achievement-progress__bar"
                    style={{ width: `${a.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <WeeklyReportSection weekly={stats.weekly} />

      <section>
        <p className="remind-section-title mb-3">공유 카드</p>
        <p className="mb-3 text-xs text-[var(--rm-text-muted)]">
          문제 사진·해설은 포함되지 않아요. 통계만 공유할 수 있어요.
        </p>
        <ShareStatsCard summary={stats.shareSummary} />
      </section>
    </div>
  );
}

function RecordStat({
  icon,
  label,
  value,
  unit,
  highlight,
}: {
  icon?: ReactNode;
  label: string;
  value: number;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`remind-card p-4 ${highlight ? "rm-stat-highlight" : ""}`}>
      {icon ? (
        <div className="mb-1 text-[var(--rm-brand-bright)]">{icon}</div>
      ) : null}
      <p className="text-xs font-medium text-[var(--rm-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--rm-text)]">
        {value}
        {unit ? (
          <span className="ml-0.5 text-sm font-semibold text-[var(--rm-text-muted)]">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}
