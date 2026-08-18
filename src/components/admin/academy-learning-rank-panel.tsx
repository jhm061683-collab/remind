"use client";

import { useMemo, useState } from "react";
import type { LearningLeaderboardRow } from "@/lib/server/rankings";

type Props = {
  rows: LearningLeaderboardRow[] | null;
  /** 선생님 계정: 담당 필터 숨김 */
  hideTeacherFilter?: boolean;
  scopeLabel?: string;
};

const PREVIEW = 10;
const MAX_SHOW = 50;

const LEVEL_OPTIONS = [
  { id: "all", label: "전체 학교급" },
  { id: "elementary", label: "초등" },
  { id: "middle", label: "중등" },
  { id: "high", label: "고등" },
  { id: "adult", label: "성인" },
] as const;

function reRank(rows: LearningLeaderboardRow[]): LearningLeaderboardRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.studyScore - a.studyScore ||
      b.attendanceDays - a.attendanceDays ||
      a.displayName.localeCompare(b.displayName, "ko"),
  );
  let rank = 1;
  return sorted.map((row, i) => {
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (
        prev.studyScore !== row.studyScore ||
        prev.attendanceDays !== row.attendanceDays
      ) {
        rank = i + 1;
      }
    }
    return { ...row, rank };
  });
}

export function AcademyLearningRankPanel({
  rows,
  hideTeacherFilter = false,
  scopeLabel = "전체",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [level, setLevel] = useState<string>("all");
  const [grade, setGrade] = useState<string>("all");
  const [classId, setClassId] = useState<string>("all");
  const [teacher, setTeacher] = useState<string>("all");

  const scopedMeta = useMemo(() => {
    if (!rows) {
      return {
        grades: [] as number[],
        classes: [] as Array<{ id: string; label: string }>,
        teachers: [] as string[],
      };
    }
    const gradeSet = new Set<number>();
    const classMap = new Map<string, string>();
    const teacherSet = new Set<string>();
    for (const row of rows) {
      if (level !== "all" && row.schoolLevel !== level) continue;
      if (row.gradeNumber != null) gradeSet.add(row.gradeNumber);
      for (const c of row.classOptions) classMap.set(c.id, c.label);
      for (const t of row.teacherNames) teacherSet.add(t);
    }
    return {
      grades: Array.from(gradeSet).sort((a, b) => a - b),
      classes: Array.from(classMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "ko")),
      teachers: Array.from(teacherSet).sort((a, b) =>
        a.localeCompare(b, "ko"),
      ),
    };
  }, [rows, level]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const matched = rows.filter((row) => {
      if (level !== "all" && row.schoolLevel !== level) return false;
      if (grade !== "all" && String(row.gradeNumber) !== grade) return false;
      if (classId !== "all" && !row.classIds.includes(classId)) return false;
      if (
        !hideTeacherFilter &&
        teacher !== "all" &&
        !row.teacherNames.includes(teacher)
      ) {
        return false;
      }
      return true;
    });
    return reRank(matched);
  }, [rows, level, grade, classId, teacher, hideTeacherFilter]);

  if (rows == null) {
    return (
      <section className="rm-glass rm-glass--compact">
        <p className="rm-label">이번 달 학습 점수 랭킹</p>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          학습 랭킹을 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  const visible = expanded
    ? filtered.slice(0, MAX_SHOW)
    : filtered.slice(0, PREVIEW);
  const canExpand = filtered.length > PREVIEW;
  const hasFilter =
    level !== "all" ||
    grade !== "all" ||
    classId !== "all" ||
    (!hideTeacherFilter && teacher !== "all");

  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="rm-label">이번 달 학습 점수 랭킹</p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            {hasFilter ? "필터 적용" : scopeLabel} · {filtered.length}명
            {expanded
              ? ` 중 상위 ${Math.min(MAX_SHOW, filtered.length)}명`
              : filtered.length > PREVIEW
                ? ` · 상위 ${Math.min(PREVIEW, filtered.length)}명`
                : ""}
          </p>
        </div>
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-lg border border-[var(--rm-border)] px-2 py-1 text-[11px] font-bold text-[var(--rm-nav-active)]"
          >
            {expanded ? "접기" : "더 보기"}
          </button>
        ) : null}
      </div>

      <div
        className={`mt-2 grid gap-1.5 ${
          hideTeacherFilter
            ? "grid-cols-3 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setGrade("all");
            setClassId("all");
            setTeacher("all");
            setExpanded(false);
          }}
          className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--rm-text)]"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setExpanded(false);
          }}
          className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--rm-text)]"
        >
          <option value="all">전체 학년</option>
          {scopedMeta.grades.map((g) => (
            <option key={g} value={String(g)}>
              {g}학년
            </option>
          ))}
        </select>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setExpanded(false);
          }}
          className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--rm-text)]"
        >
          <option value="all">전체 반</option>
          {scopedMeta.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {!hideTeacherFilter ? (
          <select
            value={teacher}
            onChange={(e) => {
              setTeacher(e.target.value);
              setExpanded(false);
            }}
            className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--rm-text)]"
          >
            <option value="all">전체 담당</option>
            {scopedMeta.teachers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-4 text-center text-xs text-[var(--rm-text-muted)]">
          {rows.length === 0
            ? "이번 달 기록이 아직 없습니다."
            : "조건에 맞는 학생이 없습니다."}
        </p>
      ) : (
        <div className="mt-3 rounded-xl border border-[var(--rm-border)]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[var(--rm-bg-elevated)] text-[var(--rm-text-muted)]">
              <tr>
                <th className="px-2.5 py-2 font-semibold">순위</th>
                <th className="px-2.5 py-2 font-semibold">이름</th>
                <th className="px-2.5 py-2 font-semibold">반</th>
                <th className="px-2.5 py-2 font-semibold tabular-nums">점수</th>
                <th className="hidden px-2.5 py-2 font-semibold sm:table-cell">
                  구성
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.studentId}
                  className="border-t border-[var(--rm-border)]"
                >
                  <td className="px-2.5 py-2 font-bold tabular-nums text-[var(--rm-brand)]">
                    {row.rank}
                  </td>
                  <td className="max-w-[7rem] truncate px-2.5 py-2 font-medium text-[var(--rm-text)]">
                    {row.displayName}
                  </td>
                  <td className="max-w-[6rem] truncate px-2.5 py-2 text-[var(--rm-text-muted)]">
                    {row.classLabel ?? row.gradeLabel ?? "—"}
                  </td>
                  <td className="px-2.5 py-2 font-bold tabular-nums text-[var(--rm-text)]">
                    {row.studyScore}
                  </td>
                  <td className="hidden px-2.5 py-2 tabular-nums text-[var(--rm-text-muted)] sm:table-cell">
                    단{row.shortCount} · 중{row.mediumCount} · 장
                    {row.longCount} · 출{row.attendanceDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
