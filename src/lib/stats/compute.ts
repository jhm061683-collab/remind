import { ACHIEVEMENTS, type AchievementDef } from "@/lib/constants/achievements";
import type { StoredQuestion } from "@/lib/storage/questions";
import type { ActivityEvent } from "@/lib/types/activity";
import {
  formatWeekLabel,
  getWeekEnd,
  getWeekStart,
  isInRange,
  toDateKey,
} from "@/lib/utils/date-range";

export type AchievementProgress = AchievementDef & {
  current: number;
  unlocked: boolean;
  progress: number;
};

export type WrongReasonTrend = {
  reason: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
};

export type WeeklyReport = {
  weekLabel: string;
  weekStart: string;
  registered: number;
  reviewed: number;
  archived: number;
  topWeakness: string | null;
  trends: WrongReasonTrend[];
  insight: string | null;
};

export type UserStats = {
  totalRegistered: number;
  totalArchived: number;
  totalReviews: number;
  studyStreak: number;
  longestStreak: number;
  achievements: AchievementProgress[];
  weekly: WeeklyReport;
  shareSummary: {
    weekLabel: string;
    registeredThisWeek: number;
    reviewedThisWeek: number;
    archivedThisWeek: number;
    topWeakness: string | null;
    studyStreak: number;
    totalRegistered: number;
  };
};

function isArchived(q: StoredQuestion): boolean {
  return Boolean(q.archived) || q.phase === "completed";
}

function mergeEvents(
  stored: ActivityEvent[],
  questions: StoredQuestion[],
): ActivityEvent[] {
  const storedReviews = stored.filter((e) => e.type === "reviewed");
  const reviewedQuestionIds = new Set(
    storedReviews
      .map((e) => e.questionId)
      .filter((id): id is string => Boolean(id)),
  );

  const legacyReviews: ActivityEvent[] = [];
  for (const q of questions) {
    if (q.lastAnsweredAt && !reviewedQuestionIds.has(q.id)) {
      legacyReviews.push({
        id: `legacy-rev-${q.id}`,
        type: "reviewed",
        questionId: q.id,
        createdAt: q.lastAnsweredAt,
      });
    }
  }

  const storedRegistered = stored.filter((e) => e.type === "registered");
  const registeredQuestionIds = new Set(
    storedRegistered
      .map((e) => e.questionId)
      .filter((id): id is string => Boolean(id)),
  );
  const legacyRegistered: ActivityEvent[] = questions
    .filter((q) => !registeredQuestionIds.has(q.id))
    .map((q) => ({
      id: `legacy-reg-${q.id}`,
      type: "registered" as const,
      questionId: q.id,
      wrongReason: q.wrongReason,
      createdAt: q.createdAt,
    }));

  const storedArchived = stored.filter((e) => e.type === "archived");
  const archivedQuestionIds = new Set(
    storedArchived
      .map((e) => e.questionId)
      .filter((id): id is string => Boolean(id)),
  );
  const legacyArchived: ActivityEvent[] = questions
    .filter((q) => isArchived(q) && !archivedQuestionIds.has(q.id))
    .map((q) => ({
      id: `legacy-arc-${q.id}`,
      type: "archived" as const,
      questionId: q.id,
      createdAt: q.lastAnsweredAt ?? q.createdAt,
    }));

  return [
    ...storedReviews,
    ...legacyReviews,
    ...storedRegistered,
    ...legacyRegistered,
    ...storedArchived,
    ...legacyArchived,
  ];
}

function countByType(events: ActivityEvent[], type: ActivityEvent["type"]): number {
  return events.filter((e) => e.type === type).length;
}

function countInRange(
  events: ActivityEvent[],
  type: ActivityEvent["type"],
  start: Date,
  end: Date,
): number {
  return events.filter(
    (e) => e.type === type && isInRange(e.createdAt, start, end),
  ).length;
}

function computeStreak(reviewDates: string[]): { current: number; longest: number } {
  const days = new Set(
    reviewDates.map((iso) => toDateKey(new Date(iso))),
  );
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]!);
    const curr = new Date(sorted[i]!);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (diff > 1) {
      run = 1;
    }
  }

  let current = 0;
  const todayKey = toDateKey(new Date());
  let cursor = todayKey;
  while (days.has(cursor)) {
    current += 1;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = toDateKey(d);
  }

  return { current, longest };
}

function wrongReasonCountsInRange(
  questions: StoredQuestion[],
  start: Date,
  end: Date,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (!q.wrongReason) continue;
    if (!isInRange(q.createdAt, start, end)) continue;
    counts.set(q.wrongReason, (counts.get(q.wrongReason) ?? 0) + 1);
  }
  return counts;
}

function topReason(counts: Map<string, number>): string | null {
  let best = "";
  let max = 0;
  for (const [reason, count] of counts) {
    if (count > max) {
      max = count;
      best = reason;
    }
  }
  return max > 0 ? best : null;
}

function buildTrends(
  questions: StoredQuestion[],
  thisStart: Date,
  thisEnd: Date,
  lastStart: Date,
  lastEnd: Date,
): WrongReasonTrend[] {
  const thisCounts = wrongReasonCountsInRange(questions, thisStart, thisEnd);
  const lastCounts = wrongReasonCountsInRange(questions, lastStart, lastEnd);
  const allReasons = new Set([...thisCounts.keys(), ...lastCounts.keys()]);

  return [...allReasons]
    .map((reason) => {
      const thisWeek = thisCounts.get(reason) ?? 0;
      const lastWeek = lastCounts.get(reason) ?? 0;
      return { reason, thisWeek, lastWeek, delta: thisWeek - lastWeek };
    })
    .filter((t) => t.thisWeek > 0 || t.lastWeek > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek);
}

function buildInsight(trends: WrongReasonTrend[]): string | null {
  const decreased = trends.filter((t) => t.delta < 0 && t.lastWeek > 0);
  if (decreased.length > 0) {
    const best = decreased.sort((a, b) => a.delta - b.delta)[0]!;
    return `${best.reason}이(가) 지난주보다 ${Math.abs(best.delta)}번 줄었어요`;
  }
  const increased = trends.filter((t) => t.delta > 0);
  if (increased.length > 0) {
    const worst = increased.sort((a, b) => b.delta - a.delta)[0]!;
    return `${worst.reason}에 집중해 보세요 — 이번 주 ${worst.thisWeek}번`;
  }
  return null;
}

function buildAchievements(
  registered: number,
  reviewed: number,
  archived: number,
  streak: number,
): AchievementProgress[] {
  const metrics: Record<string, number> = {
    registered,
    reviewed,
    archived,
    streak,
  };

  return ACHIEVEMENTS.map((def) => {
    const current = metrics[def.metric] ?? 0;
    const unlocked = current >= def.target;
    const progress = Math.min(100, Math.round((current / def.target) * 100));
    return { ...def, current, unlocked, progress };
  });
}

export function computeUserStats(
  questions: StoredQuestion[],
  storedEvents: ActivityEvent[],
): UserStats {
  const events = mergeEvents(storedEvents, questions);
  const reviewEvents = events.filter((e) => e.type === "reviewed");

  const totalRegistered = questions.length;
  const totalArchived = questions.filter(isArchived).length;
  const totalReviews = countByType(events, "reviewed");

  const { current: studyStreak, longest: longestStreak } = computeStreak(
    reviewEvents.map((e) => e.createdAt),
  );

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const thisCounts = wrongReasonCountsInRange(questions, weekStart, weekEnd);
  const trends = buildTrends(
    questions,
    weekStart,
    weekEnd,
    lastWeekStart,
    lastWeekEnd,
  );

  const weekly: WeeklyReport = {
    weekLabel: formatWeekLabel(weekStart),
    weekStart: weekStart.toISOString(),
    registered: questions.filter((q) =>
      isInRange(q.createdAt, weekStart, weekEnd),
    ).length,
    reviewed: countInRange(events, "reviewed", weekStart, weekEnd),
    archived: countInRange(events, "archived", weekStart, weekEnd),
    topWeakness: topReason(thisCounts),
    trends,
    insight: buildInsight(trends),
  };

  const achievements = buildAchievements(
    totalRegistered,
    totalReviews,
    totalArchived,
    studyStreak,
  );

  return {
    totalRegistered,
    totalArchived,
    totalReviews,
    studyStreak,
    longestStreak,
    achievements,
    weekly,
    shareSummary: {
      weekLabel: weekly.weekLabel,
      registeredThisWeek: weekly.registered,
      reviewedThisWeek: weekly.reviewed,
      archivedThisWeek: weekly.archived,
      topWeakness: weekly.topWeakness,
      studyStreak,
      totalRegistered,
    },
  };
}
