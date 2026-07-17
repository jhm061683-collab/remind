"use client";

import { useMemo, useState } from "react";
import type { AdminStudentRow } from "@/lib/types/admin";

type ChartKind =
  | "grade"
  | "class"
  | "school"
  | "teacher"
  | "activity"
  | "reviews";

type ChartSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

const CHART_OPTIONS: { id: ChartKind; label: string; hint: string }[] = [
  { id: "grade", label: "학년별", hint: "학년 기준 인원 분포" },
  { id: "class", label: "반별", hint: "소속 반 기준 인원 (복수 반이면 각각 집계)" },
  { id: "school", label: "학교급별", hint: "초·중·고·성인 분포" },
  { id: "teacher", label: "담당별", hint: "담당 선생님별 학생 수" },
  { id: "activity", label: "활동 상태", hint: "오늘 학습·마감·미접속 현황" },
  { id: "reviews", label: "복습량", hint: "누적 복습 횟수 구간별 인원" },
];

const PALETTE = [
  "#2563eb",
  "#936dff",
  "#3b82f6",
  "#7c3aed",
  "#0ea5e9",
  "#6366f1",
  "#a78bfa",
  "#1d4ed8",
  "#8b5cf6",
  "#38bdf8",
];

const SCHOOL_LABELS: Record<string, string> = {
  elementary: "초등",
  middle: "중등",
  high: "고등",
  adult: "성인",
};

function countBy(
  students: AdminStudentRow[],
  getKeys: (s: AdminStudentRow) => string[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const student of students) {
    const keys = getKeys(student);
    const unique = keys.length > 0 ? Array.from(new Set(keys)) : ["미지정"];
    for (const key of unique) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

function toSlices(map: Map<string, number>, sortLabels = true): ChartSlice[] {
  const entries = Array.from(map.entries());
  if (sortLabels) {
    entries.sort((a, b) => {
      if (a[0] === "미지정") return 1;
      if (b[0] === "미지정") return -1;
      return a[0].localeCompare(b[0], "ko");
    });
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }
  return entries.map(([label, count], i) => ({
    key: label,
    label,
    count,
    color: PALETTE[i % PALETTE.length],
  }));
}

function activitySlices(students: AdminStudentRow[]): ChartSlice[] {
  let reviewedToday = 0;
  let duePending = 0;
  let inactive7 = 0;
  let neverLogin = 0;
  let other = 0;

  for (const s of students) {
    if (s.reviewedToday > 0) {
      reviewedToday += 1;
      continue;
    }
    if (s.dueToday > 0) {
      duePending += 1;
      continue;
    }
    if (!s.lastLoginAt) {
      neverLogin += 1;
      continue;
    }
    if (s.inactiveDays >= 7) {
      inactive7 += 1;
      continue;
    }
    other += 1;
  }

  return [
    { key: "reviewed", label: "오늘 학습함", count: reviewedToday, color: "#2563eb" },
    { key: "due", label: "오늘 마감 미완료", count: duePending, color: "#936dff" },
    { key: "inactive", label: "7일+ 미접속", count: inactive7, color: "#1d4ed8" },
    { key: "never", label: "로그인 이력 없음", count: neverLogin, color: "#64748b" },
    { key: "other", label: "그 외", count: other, color: "#3b82f6" },
  ].filter((s) => s.count > 0);
}

function reviewSlices(students: AdminStudentRow[]): ChartSlice[] {
  const buckets = [
    { key: "0", label: "0회", min: 0, max: 0, color: "#a1a1aa" },
    { key: "1-9", label: "1~9회", min: 1, max: 9, color: "#0891b2" },
    { key: "10-49", label: "10~49회", min: 10, max: 49, color: "#2563eb" },
    { key: "50-99", label: "50~99회", min: 50, max: 99, color: "#7c3aed" },
    { key: "100+", label: "100회+", min: 100, max: Infinity, color: "#db2777" },
  ];
  const counts = buckets.map((b) => ({ ...b, count: 0 }));
  for (const s of students) {
    const n = s.totalReviews;
    const bucket = counts.find((b) => n >= b.min && n <= b.max);
    if (bucket) bucket.count += 1;
  }
  return counts
    .filter((b) => b.count > 0)
    .map(({ key, label, count, color }) => ({ key, label, count, color }));
}

function BarChart({ slices }: { slices: ChartSlice[] }) {
  const max = Math.max(1, ...slices.map((s) => s.count));
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (slices.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--rm-text-muted)]">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {slices.map((slice) => {
        const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0;
        return (
          <div key={slice.key}>
            <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs sm:text-sm">
              <span className="truncate font-medium text-[var(--rm-text)]">
                {slice.label}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--rm-text-muted)]">
                {slice.count}명 · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--rm-accent-muted)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(2, (slice.count / max) * 100)}%`,
                  backgroundColor: slice.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ slices }: { slices: ChartSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  if (total === 0 || slices.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--rm-text-muted)]">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  const size = 140;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--rm-border) 80%, transparent)"
            strokeWidth={stroke}
          />
          {slices.map((slice) => {
            const length = (slice.count / total) * circumference;
            const el = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold tabular-nums text-[var(--rm-text)]">
            {total}
          </p>
          <p className="text-[10px] text-[var(--rm-text-muted)]">전체</p>
        </div>
      </div>
      <ul className="w-full max-w-xs space-y-1.5 text-xs sm:text-sm">
        {slices.map((slice) => {
          const pct = Math.round((slice.count / total) * 100);
          return (
            <li
              key={slice.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[var(--rm-text)]">
                  {slice.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-[var(--rm-text-muted)]">
                {slice.count}명 ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Props = {
  students: AdminStudentRow[];
  title?: string;
};

export function StudentOverviewCharts({
  students,
  title = "학생 인원 차트",
}: Props) {
  const [kind, setKind] = useState<ChartKind>("grade");
  const [view, setView] = useState<"bar" | "donut">("bar");

  const option = CHART_OPTIONS.find((o) => o.id === kind)!;

  const slices = useMemo(() => {
    switch (kind) {
      case "grade":
        return toSlices(
          countBy(students, (s) => [s.gradeLabel ?? "미지정"]),
        );
      case "class":
        return toSlices(
          countBy(students, (s) =>
            s.classNames.length > 0
              ? s.classNames
              : [s.className ?? "미배정"],
          ),
          false,
        );
      case "school":
        return toSlices(
          countBy(students, (s) => [
            s.schoolLevel
              ? (SCHOOL_LABELS[s.schoolLevel] ?? s.schoolLevel)
              : "미지정",
          ]),
        );
      case "teacher":
        return toSlices(
          countBy(students, (s) =>
            s.teacherNames.length > 0 ? s.teacherNames : ["미배정"],
          ),
          false,
        );
      case "activity":
        return activitySlices(students);
      case "reviews":
        return reviewSlices(students);
      default:
        return [];
    }
  }, [kind, students]);

  const showDonutOption = kind !== "reviews";

  return (
    <section className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 shadow-[var(--rm-shadow-soft)] sm:p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--rm-text)]">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--rm-text-muted)]">
            {option.hint}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 self-start rounded-lg bg-[var(--rm-accent-muted)] p-0.5">
          <button
            type="button"
            onClick={() => setView("bar")}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              view === "bar"
                ? "bg-[var(--rm-surface)] text-[var(--rm-text)] shadow-sm"
                : "text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
            }`}
          >
            막대
          </button>
          <button
            type="button"
            disabled={!showDonutOption}
            onClick={() => setView("donut")}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              view === "donut"
                ? "bg-[var(--rm-surface)] text-[var(--rm-text)] shadow-sm"
                : "text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
            }`}
          >
            원형
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHART_OPTIONS.map((opt) => {
          const active = kind === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setKind(opt.id);
                if (opt.id === "reviews") setView("bar");
              }}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? "bg-[linear-gradient(135deg,var(--rm-brand-violet)_0%,var(--rm-brand)_100%)] text-white"
                  : "bg-[var(--rm-accent-muted)] text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {view === "donut" && showDonutOption ? (
          <DonutChart slices={slices} />
        ) : (
          <BarChart slices={slices} />
        )}
      </div>

      <p className="mt-2.5 border-t border-[var(--rm-border)] pt-2 text-[10px] text-[var(--rm-text-faint)]">
        기준 인원 {students.length}명
        {kind === "class" || kind === "teacher"
          ? " · 복수 소속은 중복 집계될 수 있어요"
          : null}
      </p>
    </section>
  );
}
