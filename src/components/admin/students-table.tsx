"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  bulkAssignClassAction,
  deleteStudentsAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AdminStudentRow, ClassOption } from "@/lib/types/admin";

function formatLastLogin(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  });
}

type Props = {
  students: AdminStudentRow[];
  canManage?: boolean;
  classOptions?: ClassOption[];
};

type ActivityFilter = "all" | "due_today" | "inactive_7" | "never_login";

function formatClassDisplay(student: AdminStudentRow): string {
  if (student.classNames.length > 0) return student.classNames.join(", ");
  return student.className ?? "—";
}

export function AdminStudentsTable({
  students,
  canManage = false,
  classOptions = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [classRoomId, setClassRoomId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

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
      if (activityFilter === "inactive_7" && s.inactiveDays < 7) return false;
      if (activityFilter === "never_login" && s.lastLoginAt !== null) return false;
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
  }, [students, query, classFilter, gradeFilter, teacherFilter, activityFilter]);

  const selectedNames = useMemo(() => {
    const nameById = new Map(students.map((s) => [s.id, s.displayName]));
    return selected
      .map((id) => nameById.get(id))
      .filter((name): name is string => Boolean(name));
  }, [students, selected]);

  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-6 text-center text-sm text-[var(--rm-text-muted)] shadow-sm">
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

      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름/아이디/반/담당선생님 검색"
          className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
        />
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {classNameFilters.length > 0 ? (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-xs sm:text-sm"
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
              onChange={(e) => setGradeFilter(e.target.value)}
              className="shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-xs sm:text-sm"
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
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-xs sm:text-sm"
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
            onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
            className="shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1.5 text-xs sm:text-sm"
          >
            <option value="all">전체 활동</option>
            <option value="due_today">오늘 할 것</option>
            <option value="inactive_7">7일+ 미접속</option>
            <option value="never_login">미로그인</option>
          </select>
        </div>
        {filtered.length !== students.length ? (
          <p className="text-xs text-[var(--rm-text-muted)]">
            {students.length}명 중 {filtered.length}명 표시
          </p>
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

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]">
            <tr>
              {canManage ? (
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  <input
                    type="checkbox"
                    checked={
                      selected.length > 0 && selected.length === filtered.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((s) => s.id) : [],
                      )
                    }
                  />
                </th>
              ) : null}
              <th className="whitespace-nowrap px-3 py-2 font-medium">이름</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">아이디</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">비번</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">학년</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">반</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">담당</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">최근 로그인</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">등록</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">오늘 할 것</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">오늘 품</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">연속</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">미접속</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border)]">
            {filtered.map((student) => (
              <tr key={student.id} className="text-[var(--rm-text)]">
                {canManage ? (
                  <td className="px-3 py-2">
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
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-[var(--rm-text-on-info)] hover:underline"
                  >
                    {student.displayName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--rm-text-muted)]">
                  {student.username}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--rm-text)]">
                  {student.passwordPlain ?? (
                    <span className="text-[var(--rm-text-faint)]">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--rm-text-muted)]">
                  {student.gradeLabel ?? "—"}
                </td>
                <td className="max-w-[8rem] truncate px-3 py-2 text-[var(--rm-text-muted)]">
                  {formatClassDisplay(student)}
                </td>
                <td className="max-w-[7rem] truncate px-3 py-2 text-[var(--rm-text-muted)]">
                  {student.teacherNames.length > 0 ? (
                    student.teacherNames.join(", ")
                  ) : (
                    <span className="text-[var(--rm-text-faint)]">미배정</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[var(--rm-text-muted)]">
                  {formatLastLogin(student.lastLoginAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {student.totalRegistered}개
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {student.dueToday > 0 ? (
                    <span className="font-medium text-[var(--rm-warning)]">
                      {student.dueToday}개
                    </span>
                  ) : (
                    <span className="text-[var(--rm-text-faint)]">없음</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {student.reviewedToday > 0 ? (
                    <span className="font-medium text-[var(--rm-success)]">
                      {student.reviewedToday}회
                    </span>
                  ) : (
                    <span className="text-[var(--rm-text-faint)]">0회</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {student.loginStreakDays > 0
                    ? `${student.loginStreakDays}일`
                    : "0일"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {student.inactiveDays >= 999
                    ? "미로그인"
                    : `${student.inactiveDays}일`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {filtered.map((student) => (
          <div
            key={student.id}
            className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/admin/students/${student.id}`}
                  className="font-semibold text-[var(--rm-text-on-info)]"
                >
                  {student.displayName}
                </Link>
                <p className="text-xs text-[var(--rm-text-muted)]">{student.username}</p>
              </div>
              {canManage ? (
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
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--rm-text-muted)]">
              <p className="min-w-0 truncate">
                학년: {student.gradeLabel ?? "—"}
              </p>
              <p className="min-w-0 truncate">
                반: {formatClassDisplay(student)}
              </p>
              <p className="min-w-0 truncate">
                비번: {student.passwordPlain ?? "—"}
              </p>
              <p className="min-w-0 truncate">
                담당: {student.teacherNames.join(", ") || "미배정"}
              </p>
              <p className="min-w-0 truncate">
                최근: {formatLastLogin(student.lastLoginAt)}
              </p>
              <p>등록: {student.totalRegistered}개</p>
              <p>오늘 할 것: {student.dueToday}개</p>
              <p>오늘 품: {student.reviewedToday}회</p>
              <p>연속: {student.loginStreakDays}일</p>
              <p>
                미접속:{" "}
                {student.inactiveDays >= 999
                  ? "미로그인"
                  : `${student.inactiveDays}일`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
