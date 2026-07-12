"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { bulkAssignClassAction } from "@/lib/actions/admin";
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

export function AdminStudentsTable({ students, canManage = false }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [className, setClassName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.displayName, s.username, s.className ?? "", ...s.teacherNames]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  if (students.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
        등록된 학생이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름/아이디/반/담당선생님 검색"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm sm:max-w-sm"
        />
        {canManage ? (
          <div className="flex gap-2">
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="반명 입력 (예: 중2A)"
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
          </div>
        ) : null}
      </div>
      {feedback ? (
        <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          {feedback}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">
              <input
                type="checkbox"
                checked={selected.length > 0 && selected.length === filtered.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? filtered.map((s) => s.id) : [])
                }
              />
            </th>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">아이디</th>
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
              <td className="px-4 py-3 font-medium">
                <Link href={`/admin/students/${student.id}`} className="text-blue-700 hover:underline">
                  {student.displayName}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-600">{student.username}</td>
              <td className="px-4 py-3 text-zinc-600">{student.className ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-600">
                {student.teacherNames.length > 0 ? student.teacherNames.join(", ") : <span className="text-zinc-400">미배정</span>}
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
                {student.loginStreakDays > 0 ? `${student.loginStreakDays}일` : "0일"}
              </td>
              <td className="px-4 py-3">
                {student.inactiveDays >= 999 ? "로그인 이력 없음" : `${student.inactiveDays}일`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="space-y-2 md:hidden">
        {filtered.map((student) => (
          <div key={student.id} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <Link href={`/admin/students/${student.id}`} className="font-semibold text-blue-700">
                  {student.displayName}
                </Link>
                <p className="text-xs text-zinc-500">{student.username}</p>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600">
              <p>반: {student.className ?? "—"}</p>
              <p>담당: {student.teacherNames.join(", ") || "미배정"}</p>
              <p>마지막 로그인: {formatLastLogin(student.lastLoginAt)}</p>
              <p>등록: {student.totalRegistered}개</p>
              <p>오늘 볼 것: {student.dueToday}개</p>
              <p>오늘 푼 것: {student.reviewedToday}회</p>
              <p>연속 접속: {student.loginStreakDays}일</p>
              <p>미접속: {student.inactiveDays >= 999 ? "없음" : `${student.inactiveDays}일`}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
