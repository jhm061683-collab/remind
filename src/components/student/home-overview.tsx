"use client";

import Link from "next/link";
import { MissionList } from "@/components/student/dashboard/mission-list";
import { ForgettingCurveFeed } from "@/components/student/dashboard/forgetting-curve-feed";
import { HomeSideBoost } from "@/components/student/dashboard/home-side-boost";
import { StudyPulseCard } from "@/components/student/dashboard/study-pulse-card";
import { StudentAvatarBadge } from "@/components/student/dashboard/student-avatar-badge";
import dynamic from "next/dynamic";
import { StudentMotivationPanel } from "@/components/student/dashboard/student-motivation-panel";
import { TodayFocusHero } from "@/components/student/dashboard/today-focus-hero";
import { useSubjects } from "@/components/student/subject-provider";
import type { UserStats } from "@/lib/data/user-stats";
import { getActivityEvents } from "@/lib/data/activity";
import {
  IconArchive,
  IconChart,
  IconChevronRight,
  IconList,
} from "@/components/ui/icons";
import { getHomeQuestionMeta, type StoredQuestion } from "@/lib/data/questions";
import type {
  AcademyHallOfFame,
  AcademyMonthlyBoard,
  StudentRankCard,
} from "@/lib/server/rankings";
import { computeUserStats } from "@/lib/stats/compute";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { countTodayDue, isOverdue } from "@/lib/study/today-due";
import {
  archiveStatHref,
  type ArchiveStatKind,
} from "@/lib/archive/list-query";
import { toDateKey } from "@/lib/utils/date-range";
import { useClientFormattedDate } from "@/lib/react/client-display";
import { useEffect, useMemo, useState } from "react";

const StudentAvatarPicker = dynamic(
  () =>
    import("@/components/student/dashboard/student-avatar-picker").then(
      (m) => m.StudentAvatarPicker,
    ),
  { ssr: false },
);

type Props = {
  userId: string;
  userName?: string;
  rank?: StudentRankCard | null;
  monthlyBoard?: AcademyMonthlyBoard | null;
  hallOfFame?: AcademyHallOfFame | null;
  avatarUrl?: string | null;
};

function isArchived(q: StoredQuestion): boolean {
  return Boolean(q.archived) || q.phase === "completed";
}

function formatTodayLabel(now: Date): string {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 · ${weekdays[now.getDay()]}요일`;
}

export function HomeOverview({
  userId,
  userName = "학생",
  rank = null,
  monthlyBoard = null,
  hallOfFame = null,
  avatarUrl = null,
}: Props) {
  const { subjects } = useSubjects();
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [doneToday, setDoneToday] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [allQuestions, setAllQuestions] = useState<StoredQuestion[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const avatarValue = pickedAvatar ?? avatarUrl;
  const todayLabel = useClientFormattedDate(formatTodayLabel, "오늘");

  useEffect(() => {
    let cancelled = false;
    let lastLoadedAt = 0;

    function load(force = false) {
      const now = Date.now();
      if (!force && now - lastLoadedAt < 60_000) return;
      lastLoadedAt = now;
      void Promise.all([getHomeQuestionMeta(userId), getActivityEvents(userId)])
        .then(([all, events]) => {
          if (cancelled) return;
          setLoadError(null);
          const nowDate = new Date();
          const todayKey = toDateKey(nowDate);
          const overdue = all.filter((q) => isOverdue(q, nowDate));
          const upcoming = all.filter((q) => {
            if (q.phase === "completed" || q.archived) return false;
            return toDateKey(new Date(q.nextReviewDate)) > todayKey;
          });
          const reviewedToday = events.filter(
            (e) =>
              e.type === "reviewed" &&
              toDateKey(new Date(e.createdAt)) === todayKey,
          ).length;
          setTodayCount(countTodayDue(all, nowDate));
          setOverdueCount(overdue.length);
          setDoneToday(reviewedToday);
          setUpcomingCount(upcoming.length);
          setAllQuestions(all);
          setUserStats(computeUserStats(all, events));
        })
        .catch(() => {
          if (cancelled) return;
          setLoadError("학습 데이터를 불러오지 못했습니다.");
        });
    }

    load(true);
    function onVisible() {
      if (document.visibilityState === "visible") load(false);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  useEffect(() => {
    if (!avatarPickerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAvatarPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [avatarPickerOpen]);

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

  const todayFeed = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const nameOf = new Map(subjects.map((s) => [s.id, s.name]));
    return allQuestions
      .filter((q) => {
        if (q.phase === "completed" || q.archived) return false;
        return toDateKey(new Date(q.nextReviewDate)) <= todayKey;
      })
      .sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() -
          new Date(b.nextReviewDate).getTime(),
      )
      .map((q) => ({
        id: q.id,
        subjectName: nameOf.get(q.subjectId) ?? "과목",
        source: q.source,
        phase: q.phase,
      }));
  }, [allQuestions, subjects]);

  const loading = todayCount === null && !loadError;
  const targetToday = (todayCount ?? 0) + (doneToday ?? 0);
  const rankWithAvatar = rank
    ? { ...rank, avatarUrl: avatarValue ?? rank.avatarUrl }
    : null;

  return (
    <div className="rm-page">
      <header className="rm-page-header flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            data-tour-id="student-character"
            onClick={() => setAvatarPickerOpen((v) => !v)}
            className="shrink-0 touch-manipulation rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rm-brand)]"
            aria-label="내 캐릭터 바꾸기"
          >
            <StudentAvatarBadge
              value={avatarValue}
              seed={userId}
              size="lg"
              className="border border-[var(--rm-border)] shadow-sm"
            />
          </button>
          <div className="min-w-0">
            <h1 className="rm-display">
              {userName}
              <span className="text-[var(--rm-text-muted)]">님</span>
            </h1>
            <p className="rm-body-muted">{todayLabel || "오늘"}</p>
          </div>
        </div>
        <Link
          href="/records"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-[var(--rm-nav-active)] touch-manipulation"
        >
          내 기록
          {!loading && (userStats?.studyStreak ?? 0) > 0
            ? ` · ${userStats?.studyStreak}일`
            : ""}
          <IconChevronRight size={12} className="ml-0.5 inline align-[-1px]" />
        </Link>
      </header>

      {avatarPickerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-picker-title"
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/45 p-3 sm:p-6"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p
                id="avatar-picker-title"
                className="text-lg font-bold text-[var(--rm-text)]"
              >
                내 캐릭터 꾸미기
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => setAvatarPickerOpen(false)}
                className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-[var(--rm-nav-active)]"
              >
                닫기
              </button>
            </div>
            <StudentAvatarPicker
              initialValue={avatarValue}
              seed={userId}
              gridOnly
              onSaved={(next) => {
                setPickedAvatar(next);
                setAvatarPickerOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {loadError && todayCount === null ? (
        <section className="rounded-2xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] p-4 text-sm text-[var(--rm-text-on-error)]">
          {loadError}
        </section>
      ) : (
        <TodayFocusHero
          todayCount={todayCount ?? 0}
          overdueCount={overdueCount ?? 0}
          doneToday={doneToday ?? 0}
          targetToday={targetToday}
          loading={loading}
        />
      )}

      <div data-tour-id="student-ranking">
        <StudentMotivationPanel
          rank={rankWithAvatar}
          monthlyBoard={monthlyBoard}
          hallOfFame={hallOfFame}
        />
      </div>

      <details className="group rm-glass rm-glass--compact">
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between text-sm font-bold text-[var(--rm-text)]">
          <span className="flex min-w-0 items-center gap-2">
            <IconChart size={16} className="shrink-0 text-[var(--rm-brand-violet)]" />
            이번 주 성장과 학습 계획
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--rm-nav-active)]">
            <span className="group-open:hidden">펼쳐보기</span>
            <span className="hidden group-open:inline">접기</span>
            <IconChevronRight size={14} className="transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none" />
          </span>
        </summary>
        <div className="mt-3 space-y-[var(--rm-stack)]">
          <div className="rm-stat-strip">
            <QuickStat
              label="전체"
              value={loading ? "—" : stats.total}
              kind="all"
              hint="보관함 전체 문제 보기"
            />
            <QuickStat
              label={UI_LABELS.activeStatLabel}
              value={loading ? "—" : stats.active}
              kind="active"
              hint="아직 다시 푸는 문제 보기"
            />
            <QuickStat
              label="정복률"
              value={loading ? "—" : `${masteryPct}%`}
              accent
              kind="mastered"
              hint={`보관 완료 ${stats.archived}개 보기`}
            />
            <QuickStat
              label="예정"
              value={loading ? "—" : (upcomingCount ?? 0)}
              kind="upcoming"
              hint="오늘 이후 예정 문제 보기"
            />
          </div>

          <div className="grid gap-[var(--rm-stack)] md:grid-cols-2 md:grid-rows-[auto_minmax(0,1fr)] md:items-stretch">
            <div className="md:col-start-1 md:row-start-1">
              <StudyPulseCard
                streak={userStats?.studyStreak ?? 0}
                longestStreak={userStats?.longestStreak ?? 0}
                weeklyDone={Math.min(7, userStats?.studyStreak ?? 0)}
                weekly={userStats?.weekly ?? null}
                totalReviews={userStats?.totalReviews ?? 0}
                loading={loading}
              />
            </div>
            <div className="md:col-start-2 md:row-span-2 md:min-h-0 md:h-full">
              <MissionList
                todayCount={todayCount ?? 0}
                missions={todayBySubject}
                loading={loading}
                fillHeight
              />
            </div>
            <div className="md:col-start-1 md:row-start-2 md:min-h-0 md:h-full">
              <HomeSideBoost
                todayCount={todayCount ?? 0}
                upcomingCount={upcomingCount ?? 0}
                conqueredCount={stats.archived}
                rank={rankWithAvatar}
                loading={loading}
                fillHeight
              />
            </div>
          </div>
        </div>
      </details>

      <ForgettingCurveFeed
        items={todayFeed}
        streak={userStats?.studyStreak ?? 0}
        conqueredCount={stats.archived}
        loading={loading}
      />

      {!loading && recentQuestions.length > 0 ? (
        <details className="group rm-glass rm-glass--compact">
          <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2">
            <span className="rm-label flex items-center gap-1.5">
              <IconList size={14} className="text-[var(--rm-brand-violet)]" />
              최근 등록한 문제 {recentQuestions.length}개
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--rm-nav-active)]">
              <span className="group-open:hidden">펼쳐보기</span>
              <span className="hidden group-open:inline">접기</span>
              <IconChevronRight size={14} className="transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none" />
            </span>
          </summary>
          <div className="flex justify-end">
            <Link
              href="/archive"
              className="min-h-[44px] px-2 py-3 text-xs font-semibold text-[var(--rm-nav-active)]"
            >
              보관함 전체 보기
              <IconChevronRight
                size={12}
                className="ml-0.5 inline align-[-1px]"
              />
            </Link>
          </div>
          <ul className="divide-y divide-[var(--rm-border)] overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]">
            {recentQuestions.map((q) => (
              <li
                key={q.id}
                className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-[var(--rm-text)]">
                  <span className="font-semibold">{q.subjectName}</span>
                  {q.source ? (
                    <span className="ml-1.5 text-[var(--rm-text-muted)]">
                      {q.source}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--rm-text-muted)]">
                  {q.done ? (
                    <span className="font-semibold text-[var(--rm-success)]">
                      보관 완료
                    </span>
                  ) : null}
                  {formatShortDate(q.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="rm-inline-links">
        <Link href="/archive" className="rm-inline-link">
          <IconArchive size={14} />
          보관함 {loading ? "—" : stats.archived}
        </Link>
        <Link href="/subjects" className="rm-inline-link">
          과목 설정
        </Link>
      </div>

      {!loading && stats.total === 0 ? (
        <div className="rm-glass rm-glass--compact border-dashed text-center">
          <p className="text-sm font-medium text-[var(--rm-text)]">
            아직 등록된 오답이 없습니다
          </p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            아래 버튼으로 첫 오답을 올려 보세요
          </p>
          <a
            href="/upload"
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--rm-brand)] px-4 text-sm font-bold text-white"
          >
            첫 오답 등록하기
          </a>
        </div>
      ) : null}
    </div>
  );
}

function QuickStat({
  label,
  value,
  accent,
  kind,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  kind: ArchiveStatKind;
  hint: string;
}) {
  return (
    <Link
      href={archiveStatHref(kind)}
      className="rm-stat-strip__item min-h-[56px] rounded-lg transition hover:bg-[var(--rm-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rm-brand)]"
      aria-label={`${label} ${value}. ${hint}`}
    >
      <p className="rm-stat-label">{label}</p>
      <p
        className={`rm-stat-value tabular-nums ${
          accent ? "text-[var(--rm-brand-bright)]" : "text-[var(--rm-text)]"
        }`}
      >
        {value}
      </p>
      <span className="sr-only">{hint}</span>
    </Link>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
