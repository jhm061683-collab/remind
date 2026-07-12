"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MissionList } from "@/components/student/dashboard/mission-list";
import { PrimaryActions } from "@/components/student/dashboard/primary-actions";
import { StreakProgressCard } from "@/components/student/dashboard/streak-progress-card";
import { WeeklyTrendCard } from "@/components/student/dashboard/weekly-trend-card";
import { useSubjects } from "@/components/student/subject-provider";
import type { UserStats } from "@/lib/data/user-stats";
import { getActivityEvents } from "@/lib/data/activity";
import { IconArchive, IconChevronRight, IconTrophy } from "@/components/ui/icons";
import {
  getAllQuestions,
  type StoredQuestion,
} from "@/lib/data/questions";
import { computeUserStats } from "@/lib/stats/compute";

type Props = {
  userId: string;
  userName?: string;
};

function isArchived(q: StoredQuestion): boolean {
  return Boolean(q.archived) || q.phase === "completed";
}

function formatTodayLabel(): string {
  const now = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 · ${weekdays[now.getDay()]}요일`;
}

export function HomeOverview({ userId, userName = "학생" }: Props) {
  const { subjects } = useSubjects();
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [allQuestions, setAllQuestions] = useState<StoredQuestion[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    function load() {
      void Promise.all([getAllQuestions(userId), getActivityEvents(userId)]).then(
        ([all, events]) => {
          const todayKey = toDateKey(new Date());
          const today = all.filter((q) => {
            if (q.phase === "completed" || q.archived) return false;
            return toDateKey(new Date(q.nextReviewDate)) <= todayKey;
          });
          const upcoming = all.filter((q) => {
            if (q.phase === "completed" || q.archived) return false;
            return toDateKey(new Date(q.nextReviewDate)) > todayKey;
          });
          setTodayCount(today.length);
          setUpcomingCount(upcoming.length);
          setAllQuestions(all);
          setUserStats(computeUserStats(all, events));
        },
      );
    }

    load();
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  const stats = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const q of allQuestions) {
      if (isArchived(q)) archived += 1;
      else active += 1;
    }
    return { total: allQuestions.length, active, archived };
  }, [allQuestions]);

  const todayBySubject = useMemo(() => {
    const map = new Map<string, number>();
    const todayKey = toDateKey(new Date());
    for (const q of allQuestions) {
      if (isArchived(q)) continue;
      if (toDateKey(new Date(q.nextReviewDate)) <= todayKey) {
        map.set(q.subjectId, (map.get(q.subjectId) ?? 0) + 1);
      }
    }
    return subjects
      .map((s) => ({ id: s.id, name: s.name, count: map.get(s.id) ?? 0 }))
      .filter((s) => s.count > 0);
  }, [allQuestions, subjects]);

  const masteryPct = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.archived / stats.total) * 100);
  }, [stats]);

  const loading = todayCount === null;

  return (
    <div className="rm-page">
      <header className="rm-page-header">
        <h1 className="rm-display">
          {userName}
          <span className="text-[var(--rm-text-muted)]">님</span>
        </h1>
        <p className="rm-body-muted">{formatTodayLabel()}</p>
      </header>

      <div className="rm-section-gap">
        <PrimaryActions todayCount={todayCount ?? 0} loading={loading} />

        <Link href="/records" className="rm-link-row rm-link-row--compact group">
          <span className="rm-icon-wrap h-8 w-8 shrink-0">
            <IconTrophy size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-[var(--rm-text-muted)]">내 기록</p>
            <p className="text-sm font-bold text-[var(--rm-text)]">
              {loading ? "—" : `다시 푼 ${userStats?.totalReviews ?? 0}회`}
              {!loading && (userStats?.studyStreak ?? 0) > 0 ? (
                <span className="ml-1.5 text-xs font-semibold text-[var(--rm-brand-bright)]">
                  · {userStats?.studyStreak}일 연속
                </span>
              ) : null}
            </p>
          </span>
          <IconChevronRight
            size={14}
            className="shrink-0 text-[var(--rm-text-subtle)] transition group-hover:text-[var(--rm-brand-bright)]"
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2 rm-stat-grid">
        <QuickStat label="전체" value={loading ? "—" : stats.total} />
        <QuickStat label="정리" value={loading ? "—" : stats.active} />
        <QuickStat label="정복" value={loading ? "—" : `${masteryPct}%`} accent />
        <QuickStat label="예정" value={loading ? "—" : (upcomingCount ?? 0)} />
      </div>

      <StreakProgressCard
        streak={userStats?.studyStreak ?? 0}
        longestStreak={userStats?.longestStreak ?? 0}
        weeklyDone={Math.min(7, userStats?.studyStreak ?? 0)}
        loading={loading}
      />

      <WeeklyTrendCard
        weekly={userStats?.weekly ?? null}
        totalReviews={userStats?.totalReviews ?? 0}
        loading={loading}
      />

      <MissionList
        todayCount={todayCount ?? 0}
        missions={todayBySubject}
        loading={loading}
      />

      <div className="rm-inline-links">
        <Link href="/archive" className="rm-inline-link">
          <IconArchive size={14} />
          보관 {loading ? "—" : stats.archived}
        </Link>
        <Link href="/subjects" className="rm-inline-link">
          과목 설정
        </Link>
      </div>

      {!loading && stats.total === 0 ? (
        <div className="rm-glass rm-glass--compact border-dashed text-center">
          <p className="text-sm font-medium text-[var(--rm-text)]">
            아직 저장한 문제가 없어요
          </p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            위 「사진 올리기」로 첫 오답을 등록해 보세요
          </p>
        </div>
      ) : null}
    </div>
  );
}

function QuickStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rm-glass rm-glass--compact text-center">
      <p className="rm-stat-label text-[10px] font-medium text-[var(--rm-text-muted)] sm:text-[9px]">
        {label}
      </p>
      <p
        className={`rm-stat-value mt-1 text-sm font-bold tabular-nums leading-none sm:mt-0.5 sm:text-base ${
          accent ? "text-[var(--rm-brand-bright)]" : "text-[var(--rm-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
