"use client";

import { useMemo, useState } from "react";
import type { LearningLeaderboardRow } from "@/lib/server/rankings";

type Props = {
  rows: LearningLeaderboardRow[] | null;
  title?: string;
};

type ClassBucket = {
  id: string;
  label: string;
  students: LearningLeaderboardRow[];
  avgScore: number;
  totalScore: number;
  totalShort: number;
  totalMedium: number;
  totalLong: number;
  totalAttendance: number;
};

function buildBuckets(rows: LearningLeaderboardRow[]): ClassBucket[] {
  const map = new Map<
    string,
    {
      id: string;
      label: string;
      students: LearningLeaderboardRow[];
    }
  >();

  for (const row of rows) {
    if (row.classOptions.length === 0) {
      const key = "__none__";
      const prev = map.get(key) ?? {
        id: key,
        label: "반 미배정",
        students: [],
      };
      prev.students.push(row);
      map.set(key, prev);
      continue;
    }
    for (const cls of row.classOptions) {
      const prev = map.get(cls.id) ?? {
        id: cls.id,
        label: cls.label,
        students: [],
      };
      if (!prev.students.some((s) => s.studentId === row.studentId)) {
        prev.students.push(row);
      }
      map.set(cls.id, prev);
    }
  }

  return Array.from(map.values())
    .map((bucket) => {
      const students = [...bucket.students].sort(
        (a, b) =>
          b.studyScore - a.studyScore ||
          b.attendanceDays - a.attendanceDays ||
          a.displayName.localeCompare(b.displayName, "ko"),
      );
      const totalScore = students.reduce((sum, s) => sum + s.studyScore, 0);
      const totalShort = students.reduce((sum, s) => sum + s.shortCount, 0);
      const totalMedium = students.reduce((sum, s) => sum + s.mediumCount, 0);
      const totalLong = students.reduce((sum, s) => sum + s.longCount, 0);
      const totalAttendance = students.reduce(
        (sum, s) => sum + s.attendanceDays,
        0,
      );
      return {
        id: bucket.id,
        label: bucket.label,
        students,
        totalScore,
        avgScore:
          students.length > 0
            ? Math.round((totalScore / students.length) * 10) / 10
            : 0,
        totalShort,
        totalMedium,
        totalLong,
        totalAttendance,
      };
    })
    .sort(
      (a, b) =>
        b.avgScore - a.avgScore || a.label.localeCompare(b.label, "ko"),
    );
}

export function ClassStudyVolumeBoard({
  rows,
  title = "반별 · 학생별 학습량",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const buckets = useMemo(() => (rows ? buildBuckets(rows) : []), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buckets;
    return buckets
      .map((bucket) => ({
        ...bucket,
        students: bucket.students.filter(
          (s) =>
            s.displayName.toLowerCase().includes(q) ||
            bucket.label.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (b) =>
          b.students.length > 0 || b.label.toLowerCase().includes(q),
      );
  }, [buckets, query]);

  if (rows == null) {
    return (
      <section className="rm-glass rm-glass--compact">
        <p className="rm-label">{title}</p>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          학습량을 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="rm-label">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            반을 누르면 학생별 점수·구성이 펼쳐져요 · {buckets.length}개 반
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="반·학생 검색"
          className="w-full max-w-[12rem] rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--rm-text)] sm:w-auto"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-4 text-center text-xs text-[var(--rm-text-muted)]">
          {rows.length === 0
            ? "이번 달 학습 기록이 아직 없습니다."
            : "검색 결과가 없습니다."}
        </p>
      ) : (
        <ul className="mt-3 max-h-[28rem] space-y-1.5 overflow-y-auto">
          {visible.map((bucket) => {
            const open = openId === bucket.id;
            const maxScore = Math.max(
              1,
              ...bucket.students.map((s) => s.studyScore),
            );
            return (
              <li
                key={bucket.id}
                className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenId((prev) => (prev === bucket.id ? null : bucket.id))
                  }
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left touch-manipulation"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--rm-text)]">
                      {bucket.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--rm-text-muted)]">
                      {bucket.students.length}명 · 평균 {bucket.avgScore}점 · 단
                      {bucket.totalShort} · 중{bucket.totalMedium} · 장
                      {bucket.totalLong} · 출{bucket.totalAttendance}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--rm-brand)_12%,transparent)] px-2 py-1 text-[11px] font-extrabold tabular-nums text-[var(--rm-brand)]">
                    Σ {bucket.totalScore}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-[var(--rm-nav-active)]">
                    {open ? "접기" : "학생"}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-[var(--rm-border)] bg-[var(--rm-surface)]">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[var(--rm-text-muted)]">
                        <tr>
                          <th className="px-3 py-1.5 font-semibold">학생</th>
                          <th className="px-2 py-1.5 font-semibold tabular-nums">
                            점수
                          </th>
                          <th className="hidden px-2 py-1.5 font-semibold sm:table-cell">
                            학습량
                          </th>
                          <th className="w-[30%] px-2 py-1.5 font-semibold">
                            비중
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.students.map((student) => {
                          const pct = Math.round(
                            (student.studyScore / maxScore) * 100,
                          );
                          return (
                            <tr
                              key={student.studentId}
                              className="border-t border-[var(--rm-border)]"
                            >
                              <td className="max-w-[8rem] truncate px-3 py-2 font-medium text-[var(--rm-text)]">
                                {student.displayName}
                              </td>
                              <td className="px-2 py-2 font-bold tabular-nums text-[var(--rm-text)]">
                                {student.studyScore}
                              </td>
                              <td className="hidden px-2 py-2 tabular-nums text-[var(--rm-text-muted)] sm:table-cell">
                                단{student.shortCount} · 중
                                {student.mediumCount} · 장{student.longCount} ·
                                출{student.attendanceDays}
                              </td>
                              <td className="px-2 py-2">
                                <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--rm-text)_8%,transparent)]">
                                  <div
                                    className="h-full rounded-full bg-[var(--rm-brand)]"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
