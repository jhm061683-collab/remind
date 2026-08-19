"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  bulkAssignClassAction,
  deleteStudentsAction,
} from "@/lib/actions/admin";
import { StudentConsultingModal } from "@/components/admin/student-consulting-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterEmptyState } from "@/components/ui/status-state";
import {
  parseStudentListQuery,
  studentListHref,
} from "@/lib/admin/student-list-query";
import { describeStaffing } from "@/lib/admin/staff-relation";
import type { AdminStudentRow, ClassOption } from "@/lib/types/admin";

function formatLastLogin(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  students: AdminStudentRow[];
  canManage?: boolean;
  classOptions?: ClassOption[];
};

type ActivityFilter =
  | "all"
  | "due_today"
  | "backlog"
  | "inactive_7"
  | "never_login"
  | "inactive_or_never";

const PAGE_SIZE = 18;

function formatClassDisplay(student: AdminStudentRow): string {
  if (student.classNames.length > 0) return student.classNames.join(", ");
  return student.className ?? "—";
}

function attentionState(student: AdminStudentRow): {
  label: string;
  className: string;
} {
  if (!student.lastLoginAt) {
    return {
      label: "첫 로그인 전",
      className:
        "border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] text-[var(--rm-text-on-error)]",
    };
  }
  if (student.inactiveDays >= 7) {
    return {
      label: `${student.inactiveDays}일 미접속`,
      className:
        "border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] text-[var(--rm-text-on-error)]",
    };
  }
  if (student.dueToday >= 5) {
    return {
      label: `복습 ${student.dueToday}개 밀림`,
      className:
        "border-[color-mix(in_srgb,var(--rm-warning)_35%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] text-[var(--rm-text)]",
    };
  }
  if (student.dueToday > 0) {
    return {
      label: `오늘 ${student.dueToday}개`,
      className:
        "border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] text-[var(--rm-text-on-info)]",
    };
  }
  return {
    label: "정상",
    className:
      "border-[var(--rm-success-border)] bg-[var(--rm-success-bg)] text-[var(--rm-text-on-success)]",
  };
}

export function AdminStudentsTable({
  students,
  canManage = false,
  classOptions = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = parseStudentListQuery(searchParams);
  const query = listQuery.q;
  const classFilter = listQuery.className;
  const gradeFilter = listQuery.grade;
  const teacherFilter = listQuery.teacher;
  const activityFilter = listQuery.activity as ActivityFilter;
  const assignmentFilter = listQuery.assignment;
  const [selected, setSelected] = useState<string[]>([]);
  const [classRoomId, setClassRoomId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [consulting, setConsulting] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function commitList(patch: {
    q?: string;
    className?: string;
    grade?: string;
    teacher?: string;
    activity?: ActivityFilter;
    assignment?: "all" | "unassigned";
  }) {
    const current = {
      q: patch.q ?? query,
      className: patch.className ?? classFilter,
      grade: patch.grade ?? gradeFilter,
      teacher: patch.teacher ?? teacherFilter,
      activity: patch.activity ?? activityFilter,
      assignment: patch.assignment ?? assignmentFilter,
      page: 1,
    };
    router.replace(
      studentListHref(
        {
          ...current,
          scope: searchParams.get("scope"),
          tab: searchParams.get("tab"),
        },
        current,
      ),
      { scroll: false },
    );
  }

  const classNameFilters = useMemo(() => {
    const names = new Set<string>();
    for (const student of students) {
      for (const name of student.classNames) names.add(name);
      if (student.className && student.classNames.length === 0) {
        names.add(student.className);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ko"));
  }, [students]);

  const gradeOptions = useMemo(() => {
    const labels = new Set(
      students.map((s) => s.gradeLabel).filter((l): l is string => Boolean(l)),
    );
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ko"));
  }, [students]);

  const teacherOptions = useMemo(() => {
    const names = new Set<string>();
    for (const student of students) {
      for (const name of student.teacherNames) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ko"));
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== "all") {
        const inClass =
          s.classNames.includes(classFilter) || s.className === classFilter;
        if (!inClass) return false;
      }
      if (gradeFilter !== "all" && s.gradeLabel !== gradeFilter) return false;
      if (teacherFilter !== "all" && !s.teacherNames.includes(teacherFilter)) {
        return false;
      }
      if (activityFilter === "due_today" && s.dueToday <= 0) return false;
      if (activityFilter === "backlog" && s.dueToday < 5) return false;
      if (activityFilter === "inactive_7" && s.inactiveDays < 7) return false;
      if (activityFilter === "never_login" && s.lastLoginAt !== null) return false;
      if (
        activityFilter === "inactive_or_never" &&
        s.lastLoginAt !== null &&
        s.inactiveDays < 7
      ) {
        return false;
      }
      if (
        assignmentFilter === "unassigned" &&
        (s.classNames.length > 0 || Boolean(s.className))
      ) {
        return false;
      }
      if (!q) return true;
      return [
        s.displayName,
        s.username,
        s.gradeLabel ?? "",
        s.className ?? "",
        ...s.classNames,
        ...s.teacherNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [
    students,
    query,
    classFilter,
    gradeFilter,
    teacherFilter,
    activityFilter,
    assignmentFilter,
  ]);

  const selectedNames = useMemo(() => {
    const nameById = new Map(students.map((s) => [s.id, s.displayName]));
    return selected
      .map((id) => nameById.get(id))
      .filter((name): name is string => Boolean(name));
  }, [students, selected]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(listQuery.page, pageCount);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters =
    Boolean(query.trim()) ||
    classFilter !== "all" ||
    gradeFilter !== "all" ||
    teacherFilter !== "all" ||
    activityFilter !== "all";
  const hasAssignmentFilter = assignmentFilter !== "all";

  function goPage(nextPage: number) {
    router.replace(
      studentListHref(
        {
          q: query,
          className: classFilter,
          grade: gradeFilter,
          teacher: teacherFilter,
          activity: activityFilter,
          assignment: assignmentFilter,
          page: nextPage,
          scope: searchParams.get("scope"),
          tab: searchParams.get("tab"),
        },
        listQuery,
      ),
      { scroll: false },
    );
  }

  function resetFilters() {
    commitList({
      q: "",
      className: "all",
      grade: "all",
      teacher: "all",
      activity: "all",
      assignment: "all",
    });
  }

  if (students.length === 0) {
    return (
      <p
        data-tour-id="admin-students-table"
        className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-6 text-center text-sm text-[var(--rm-text-muted)] shadow-sm"
      >
        등록된 학생이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ConfirmDialog
        open={showDeleteConfirm}
        title={`${selected.length}명 계정을 삭제할까요?`}
        description={[
          selectedNames.slice(0, 5).join(", ") +
            (selectedNames.length > 5 ? ` 외 ${selectedNames.length - 5}명` : ""),
          "",
          "로그인 계정·문제·학습 기록이 모두 지워지고 되돌릴 수 없어요.",
        ].join("\n")}
        confirmLabel="계정 삭제"
        cancelLabel="취소"
        variant="danger"
        loading={pending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteStudentsAction(selected);
            if (result.error) {
              setFeedback(result.error);
            } else {
              setFeedback(result.success ?? null);
              setSelected([]);
            }
            setShowDeleteConfirm(false);
          });
        }}
      />

      <div className="space-y-3" data-tour-id="admin-students-table">
        <label className="block">
          <span className="sr-only">학생 검색</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              commitList({ q: next });
            }}
            placeholder="이름/아이디/반/담당선생님 검색"
            className="min-h-[44px] w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {classNameFilters.length > 0 ? (
            <select
              value={classFilter}
              aria-label="반 필터"
              onChange={(e) => {
                commitList({ className: e.target.value });
              }}
              className="min-h-[44px] shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-[13px] sm:text-sm"
            >
              <option value="all">전체 반</option>
              {classNameFilters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          {gradeOptions.length > 0 ? (
            <select
              value={gradeFilter}
              aria-label="학년 필터"
              onChange={(e) => {
                commitList({ grade: e.target.value });
              }}
              className="min-h-[44px] shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-[13px] sm:text-sm"
            >
              <option value="all">전체 학년</option>
              {gradeOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
          {teacherOptions.length > 0 ? (
            <select
              value={teacherFilter}
              aria-label="담당 선생님 필터"
              onChange={(e) => {
                commitList({ teacher: e.target.value });
              }}
              className="min-h-[44px] shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-[13px] sm:text-sm"
            >
              <option value="all">전체 담당</option>
              {teacherOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={activityFilter}
            aria-label="활동 상태 필터"
            onChange={(e) => {
              const next = e.target.value as ActivityFilter;
              commitList({ activity: next });
            }}
            className="min-h-[44px] shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-[13px] sm:text-sm"
          >
            <option value="all">전체 활동</option>
            <option value="due_today">오늘 할 것</option>
            <option value="backlog">복습 밀림</option>
            <option value="inactive_7">7일+ 미접속</option>
            <option value="never_login">미로그인</option>
            <option value="inactive_or_never">장기 미접속·미로그인</option>
          </select>
          {canManage ? (
            <select
              value={assignmentFilter}
              aria-label="반 배정 필터"
              onChange={(event) =>
                commitList({
                  assignment: event.target.value as "all" | "unassigned",
                })
              }
              className="min-h-[44px] shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-[13px] sm:text-sm"
            >
              <option value="all">전체 배정 상태</option>
              <option value="unassigned">반 미배정</option>
            </select>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-[var(--rm-text-muted)]" aria-live="polite">
            전체 {students.length}명 · 조건에 맞는 학생{" "}
            <strong className="text-[var(--rm-text)]">{filtered.length}명</strong>
            {filtered.length > PAGE_SIZE ? ` · ${page}/${pageCount}쪽` : ""}
          </p>
          {hasFilters || hasAssignmentFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[44px] rounded-lg px-3 text-[13px] font-bold text-[var(--rm-nav-active)]"
            >
              필터 초기화
            </button>
          ) : null}
        </div>
        {filtered.length === 0 ? (
          <FilterEmptyState
            summary={`검색·필터 조건에 맞는 학생이 없습니다.`}
            onReset={resetFilters}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {classOptions.length > 0 ? (
              <>
                <select
                  value={classRoomId}
                  onChange={(e) => setClassRoomId(e.target.value)}
                  className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm text-[var(--rm-text)]"
                >
                  <option value="">반 선택</option>
                  {classOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.displayLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending || selected.length === 0 || !classRoomId}
                  className="rm-fill-brand whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 sm:text-sm"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await bulkAssignClassAction(
                        selected,
                        classRoomId,
                      );
                      setFeedback(result.error ?? result.success ?? null);
                    });
                  }}
                >
                  반 일괄배정
                </button>
              </>
            ) : (
              <Link
                href="/admin/classes"
                className="whitespace-nowrap rounded-lg border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-3 py-2 text-xs font-semibold text-[var(--rm-text-on-info)] sm:text-sm"
              >
                먼저 반 만들기
              </Link>
            )}
            <button
              type="button"
              disabled={pending || selected.length === 0}
              className="whitespace-nowrap rounded-lg border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-3 py-2 text-xs font-semibold text-[var(--rm-text-on-error)] disabled:opacity-50 sm:text-sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              계정 삭제
            </button>
          </div>
        ) : null}
      </div>
      {feedback ? (
        <p className="rounded-xl bg-[var(--rm-accent-muted)] px-3 py-2 text-xs whitespace-pre-line text-[var(--rm-text)]">
          {feedback}
        </p>
      ) : null}
      {canManage && selected.length > 0 ? (
        <p className="text-xs text-[var(--rm-text-muted)]">{selected.length}명 선택됨</p>
      ) : null}

      <div className="hidden overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-sm lg:block">
        <table className="w-full table-fixed text-left text-[13px]">
          <thead className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]">
            <tr>
              {canManage ? (
                <th className="w-12 px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    aria-label="현재 쪽 학생 전체 선택"
                    checked={
                      paged.length > 0 && paged.every((s) => selected.includes(s.id))
                    }
                    onChange={(e) => {
                      const pageIds = new Set(paged.map((s) => s.id));
                      setSelected((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, ...pageIds]))
                          : prev.filter((id) => !pageIds.has(id)),
                      );
                    }}
                  />
                </th>
              ) : null}
              <th className="w-[22%] px-3 py-2 font-medium">학생</th>
              <th className="w-[18%] px-3 py-2 font-medium">위험·활동 상태</th>
              <th className="w-[14%] px-3 py-2 font-medium">오늘 복습</th>
              <th className="w-[18%] px-3 py-2 font-medium">최근 접속</th>
              <th className="w-[20%] px-3 py-2 font-medium">주 담당·공동 담당</th>
              <th className="w-20 px-3 py-2 text-right font-medium">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border)]">
            {paged.map((student) => {
              const attention = attentionState(student);
              const staffing = describeStaffing({
                teacherNames: student.teacherNames,
                subAdminName: student.subAdminName,
              });
              return (
              <tr key={student.id} className="text-[var(--rm-text)]">
                {canManage ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${student.displayName} 선택`}
                      checked={selected.includes(student.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, student.id]
                            : prev.filter((id) => id !== student.id),
                        )
                      }
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConsulting({
                        id: student.id,
                        name: student.displayName,
                      })
                    }
                    className="block max-w-full truncate text-left font-bold text-[var(--rm-text-on-info)] hover:underline"
                  >
                    {student.displayName}
                  </button>
                  <p className="truncate text-[12px] text-[var(--rm-text-muted)]">
                    {[student.gradeLabel, formatClassDisplay(student)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="truncate text-[12px] text-[var(--rm-text-faint)]">
                    {student.username}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[12px] font-bold ${attention.className}`}>
                    {attention.label}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold tabular-nums">대기 {student.dueToday}개</p>
                  <p className="text-[12px] text-[var(--rm-text-muted)]">
                    오늘 완료 {student.reviewedToday}회
                  </p>
                </td>
                <td className="px-3 py-2 text-[var(--rm-text-muted)]">
                  {formatLastLogin(student.lastLoginAt)}
                </td>
                <td className="px-3 py-2">
                  <p className="truncate font-medium">{staffing.label}</p>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="inline-flex min-h-[44px] items-center rounded-lg px-2 font-bold text-[var(--rm-nav-active)]"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {paged.map((student) => {
          const attention = attentionState(student);
          const staffing = describeStaffing({
            teacherNames: student.teacherNames,
            subAdminName: student.subAdminName,
          });
          return (
          <div
            key={student.id}
            className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--rm-text)]">
                  {student.displayName}
                </p>
                <p className="truncate text-[12px] text-[var(--rm-text-muted)]">
                  {[student.gradeLabel, formatClassDisplay(student), staffing.label]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full border px-2 py-1 text-[12px] font-bold ${attention.className}`}>
                  {attention.label}
                </span>
                {canManage ? (
                  <label className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                    <span className="sr-only">{student.displayName} 선택</span>
                    <input
                      type="checkbox"
                      checked={selected.includes(student.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, student.id]
                            : prev.filter((id) => id !== student.id),
                        )
                      }
                    />
                  </label>
                ) : null}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-[var(--rm-surface-raised)] px-3 py-2 text-[13px]">
              <p>
                <span className="text-[var(--rm-text-muted)]">오늘 복습</span>{" "}
                <strong>{student.dueToday}개</strong>
              </p>
              <p>
                <span className="text-[var(--rm-text-muted)]">최근</span>{" "}
                <strong>{formatLastLogin(student.lastLoginAt)}</strong>
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link
                href={`/admin/students/${student.id}`}
                className="rm-fill-brand inline-flex min-h-[44px] items-center rounded-lg px-3 text-[13px] font-bold text-white"
              >
                상세
              </Link>
              <button
                type="button"
                onClick={() =>
                  setConsulting({
                    id: student.id,
                    name: student.displayName,
                  })
                }
                className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--rm-border)] px-3 text-[13px] font-bold text-[var(--rm-text)]"
              >
                상담 요약
              </button>
            </div>
            <details className="mt-1 text-[13px] text-[var(--rm-text-muted)]">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-[var(--rm-nav-active)] marker:content-none">
                학습 정보 더보기
              </summary>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--rm-border)] pt-2">
                <p>아이디: {student.username}</p>
                <p>등록: {student.totalRegistered}개</p>
                <p>오늘 완료: {student.reviewedToday}회</p>
                <p>연속 출석: {student.loginStreakDays}일</p>
              </div>
            </details>
          </div>
        );})}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <nav className="flex items-center justify-center gap-3" aria-label="학생 목록 페이지">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            className="min-h-[44px] rounded-xl border border-[var(--rm-border)] px-4 text-sm font-bold text-[var(--rm-text)] disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm font-semibold text-[var(--rm-text-muted)]">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goPage(page + 1)}
            className="min-h-[44px] rounded-xl border border-[var(--rm-border)] px-4 text-sm font-bold text-[var(--rm-text)] disabled:opacity-40"
          >
            다음
          </button>
        </nav>
      ) : null}

      {consulting ? (
        <StudentConsultingModal
          open
          studentId={consulting.id}
          studentName={consulting.name}
          onClose={() => setConsulting(null)}
        />
      ) : null}
    </div>
  );
}
