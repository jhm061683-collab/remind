"use client";

import Link from "next/link";
import { MissionList } from "@/components/student/dashboard/mission-list";
import { PrimaryActions } from "@/components/student/dashboard/primary-actions";
import { StudyPulseCard } from "@/components/student/dashboard/study-pulse-card";
import { useSubjects } from "@/components/student/subject-provider";
import type { UserStats } from "@/lib/data/user-stats";
import { getActivityEvents } from "@/lib/data/activity";
import { IconArchive, IconChevronRight } from "@/components/ui/icons";
import {
  getAllQuestions,
  type StoredQuestion,
} from "@/lib/data/questions";
import { computeUserStats } from "@/lib/stats/compute";
import { useEffect, useMemo, useState } from "react";

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

  const recentQuestions = useMemo(() => {
    const nameOf = new Map(subjects.map((s) => [s.id, s.name]));
    return [...allQuestions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 4)
      .map((q) => ({
        id: q.id,
        subjectName: nameOf.get(q.subjectId) ?? "과목",
        source: q.source,
        createdAt: q.createdAt,
        done: isArchived(q),
      }));
  }, [allQuestions, subjects]);

  const loading = todayCount === null;

  return (
    <div className="rm-page">
      <header className="rm-page-header flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="rm-display">
            {userName}
            <span className="text-[var(--rm-text-muted)]">님</span>
          </h1>
          <p className="rm-body-muted">{formatTodayLabel()}</p>
        </div>
        <Link
          href="/records"
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--rm-nav-active)] touch-manipulation"
        >
          기록
          {!loading && (userStats?.studyStreak ?? 0) > 0
            ? ` · ${userStats?.studyStreak}일`
            : ""}
          <IconChevronRight size={12} className="ml-0.5 inline align-[-1px]" />
        </Link>
      </header>

      <PrimaryActions todayCount={todayCount ?? 0} loading={loading} />

      {/* 한 줄 통계 스트립 — 카드 4장 대신 divider */}
      <div className="rm-stat-strip">
        <QuickStat label="전체" value={loading ? "—" : stats.total} />
        <QuickStat label="정리" value={loading ? "—" : stats.active} />
        <QuickStat
          label="정복"
          value={loading ? "—" : `${masteryPct}%`}
          accent
        />
        <QuickStat label="예정" value={loading ? "—" : (upcomingCount ?? 0)} />
      </div>

      {/* 데스크톱에서는 두 카드를 나란히 배치해 가로 공간을 활용 */}
      <div className="grid grid-cols-1 gap-[var(--rm-stack)] md:grid-cols-2 md:items-start">
        <StudyPulseCard
          streak={userStats?.studyStreak ?? 0}
          longestStreak={userStats?.longestStreak ?? 0}
          weeklyDone={Math.min(7, userStats?.studyStreak ?? 0)}
          weekly={userStats?.weekly ?? null}
          totalReviews={userStats?.totalReviews ?? 0}
          loading={loading}
        />

        <MissionList
          todayCount={todayCount ?? 0}
          missions={todayBySubject}
          loading={loading}
        />
      </div>

      {!loading && recentQuestions.length > 0 ? (
        <section className="rm-glass rm-glass--compact">
          <div className="flex items-center justify-between gap-2">
            <p className="rm-label">최근 등록한 문제</p>
            <Link
              href="/archive"
              className="text-[11px] font-semibold text-[var(--rm-nav-active)]"
            >
              전체 보기
              <IconChevronRight size={12} className="ml-0.5 inline align-[-1px]" />
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-[var(--rm-border)] overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]">
            {recentQuestions.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-[var(--rm-text)]">
                  <span className="font-semibold">{q.subjectName}</span>
                  {q.source ? (
                    <span className="ml-1.5 text-[var(--rm-text-muted)]">
                      {q.source}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[11px] text-[var(--rm-text-muted)]">
                  {q.done ? (
                    <span className="font-semibold text-[var(--rm-success)]">
                      정복
                    </span>
                  ) : null}
                  {formatShortDate(q.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    <div className="rm-stat-strip__item">
      <p className="rm-stat-label">{label}</p>
      <p
        className={`rm-stat-value tabular-nums ${
          accent ? "text-[var(--rm-brand-bright)]" : "text-[var(--rm-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
