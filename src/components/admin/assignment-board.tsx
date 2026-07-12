"use client";

import { useState, useTransition } from "react";
import { assignStudentAction } from "@/lib/actions/admin";
import type { AdminStudentRow, SubAdminRow } from "@/lib/types/admin";

type Props = {
  students: AdminStudentRow[];
  subAdmins: SubAdminRow[];
};

export function AssignmentBoard({ students, subAdmins }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleAssign(studentId: string, subAdminId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await assignStudentAction(
        studentId,
        subAdminId === "" ? null : subAdminId,
      );
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("배정이 저장되었습니다.");
      }
    });
  }

  if (students.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm">
        배정할 학생이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p
          className={`rounded-xl px-4 py-2 text-sm ${
            message.includes("저장")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">학생</th>
              <th className="px-4 py-3 font-medium">담당 선생님</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">
                    {student.displayName}
                  </p>
                  <p className="text-xs text-zinc-500">{student.username}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                    value={student.subAdminId ?? ""}
                    disabled={pending || subAdmins.length === 0}
                    onChange={(e) =>
                      handleAssign(student.id, e.target.value)
                    }
                  >
                    <option value="">미배정</option>
                    {subAdmins.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.displayName} ({teacher.username})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subAdmins.length === 0 ? (
        <p className="text-sm text-zinc-500">
          서브관리자 계정이 없습니다. Supabase에서 teacher 계정을 먼저
          만들어 주세요.
        </p>
      ) : null}
    </div>
  );
}
