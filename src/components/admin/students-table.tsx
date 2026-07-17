"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  bulkAssignClassAction,
  deleteStudentsAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AdminStudentRow } from "@/lib/types/admin";

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
};

type ActivityFilter = "all" | "due_today" | "inactive_7" | "never_login";

function formatClassDisplay(student: AdminStudentRow): string {
  if (student.classNames.length > 0) return student.classNames.join(", ");
  return student.className ?? "—";
}

export function AdminStudentsTable({ students, canManage = false }: Props) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [className, setClassName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const classOptions = useMemo(() => {
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
      <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
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
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {classOptions.length > 0 ? (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">전체 반</option>
              {classOptions.map((name) => (
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
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
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
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
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
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">전체 활동</option>
            <option value="due_today">오늘 볼 문제 있음</option>
            <option value="inactive_7">7일 이상 미접속</option>
            <option value="never_login">로그인 이력 없음</option>
          </select>
        </div>
        {filtered.length !== students.length ? (
          <p className="text-xs text-zinc-500">
            {students.length}명 중 {filtered.length}명 표시
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="반명 (기존 반에 추가)"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || selected.length === 0}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  const result = await bulkAssignClassAction(selected, className);
                  setFeedback(result.error ?? result.success ?? null);
                });
              }}
            >
              반 일괄배정
            </button>
            <button
              type="button"
              disabled={pending || selected.length === 0}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              계정 삭제
            </button>
          </div>
        ) : null}
      </div>
      {feedback ? (
        <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs whitespace-pre-line text-zinc-700">
          {feedback}
        </p>
      ) : null}
      {canManage && selected.length > 0 ? (
        <p className="text-xs text-zinc-500">{selected.length}명 선택됨</p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              {canManage ? (
                <th className="px-4 py-3 font-medium">
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
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">아이디</th>
              <th className="px-4 py-3 font-medium">비밀번호</th>
              <th className="px-4 py-3 font-medium">학년</th>
              <th className="px-4 py-3 font-medium">반</th>
              <th className="px-4 py-3 font-medium">담당 선생님</th>
              <th className="px-4 py-3 font-medium">마지막 로그인</th>
              <th className="px-4 py-3 font-medium">등록</th>
              <th className="px-4 py-3 font-medium">오늘 볼 것</th>
              <th className="px-4 py-3 font-medium">오늘 푼 것</th>
              <th className="px-4 py-3 font-medium">접속 연속</th>
              <th className="px-4 py-3 font-medium">미접속</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((student) => (
              <tr key={student.id} className="text-zinc-800">
                {canManage ? (
                  <td className="px-4 py-3">
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
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {student.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{student.username}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                  {student.passwordPlain ?? (
                    <span className="text-zinc-400">미기록</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {student.gradeLabel ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatClassDisplay(student)}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {student.teacherNames.length > 0 ? (
                    student.teacherNames.join(", ")
                  ) : (
                    <span className="text-zinc-400">미배정</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatLastLogin(student.lastLoginAt)}
                </td>
                <td className="px-4 py-3">{student.totalRegistered}개</td>
                <td className="px-4 py-3">
                  {student.dueToday > 0 ? (
                    <span className="font-medium text-amber-600">
                      {student.dueToday}개
                    </span>
                  ) : (
                    <span className="text-zinc-400">없음</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.reviewedToday > 0 ? (
                    <span className="font-medium text-emerald-600">
                      {student.reviewedToday}회
                    </span>
                  ) : (
                    <span className="text-zinc-400">0회</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {student.loginStreakDays > 0
                    ? `${student.loginStreakDays}일`
                    : "0일"}
                </td>
                <td className="px-4 py-3">
                  {student.inactiveDays >= 999
                    ? "로그인 이력 없음"
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
            className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/admin/students/${student.id}`}
                  className="font-semibold text-blue-700"
                >
                  {student.displayName}
                </Link>
                <p className="text-xs text-zinc-500">{student.username}</p>
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600">
              <p>학년: {student.gradeLabel ?? "—"}</p>
              <p>반: {formatClassDisplay(student)}</p>
              <p>비밀번호: {student.passwordPlain ?? "미기록"}</p>
              <p>담당: {student.teacherNames.join(", ") || "미배정"}</p>
              <p>마지막 로그인: {formatLastLogin(student.lastLoginAt)}</p>
              <p>등록: {student.totalRegistered}개</p>
              <p>오늘 볼 것: {student.dueToday}개</p>
              <p>오늘 푼 것: {student.reviewedToday}회</p>
              <p>연속 접속: {student.loginStreakDays}일</p>
              <p>
                미접속:{" "}
                {student.inactiveDays >= 999
                  ? "없음"
                  : `${student.inactiveDays}일`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
