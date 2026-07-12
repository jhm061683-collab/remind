"use client";

import { useState, useTransition } from "react";
import {
  resetStudentPasswordAction,
  saveStudentDetailAction,
  sendAdminNotificationAction,
} from "@/lib/actions/admin";
import type { StudentDetailData } from "@/lib/types/admin";

type TeacherOption = { id: string; displayName: string };

type Props = {
  detail: StudentDetailData;
  teacherOptions: TeacherOption[];
};

export function StudentDetailPanel({ detail, teacherOptions }: Props) {
  const student = detail.student;
  const [className, setClassName] = useState(student.className ?? "");
  const [phone, setPhone] = useState(student.phone ?? "");
  const [schoolLevel, setSchoolLevel] = useState(student.schoolLevel ?? "middle");
  const [gradeNumber, setGradeNumber] = useState(student.gradeNumber ?? 1);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">{student.displayName}</h2>
        <p className="text-sm text-zinc-500">
          아이디 {student.username} · 마지막 로그인 {student.lastLoginAt ?? "없음"}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="휴대폰"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="반명"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value as typeof schoolLevel)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="elementary">초등</option>
            <option value="middle">중등</option>
            <option value="high">고등</option>
            <option value="adult">성인</option>
          </select>
          <input
            type="number"
            min={1}
            max={10}
            value={gradeNumber}
            onChange={(e) => setGradeNumber(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-zinc-600">담당 선생님(복수 가능)</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {teacherOptions.map((teacher) => (
              <label key={teacher.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={teacherIds.includes(teacher.id)}
                  onChange={(e) =>
                    setTeacherIds((prev) =>
                      e.target.checked
                        ? [...prev, teacher.id]
                        : prev.filter((id) => id !== teacher.id),
                    )
                  }
                />
                <span className="text-sm">{teacher.displayName}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const res = await saveStudentDetailAction(student.id, {
                className,
                teacherIds,
                schoolLevel,
                gradeNumber,
                phone,
              });
              setMessage(res.error ?? res.success ?? null);
            })
          }
        >
          학생 정보 저장
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900">관리자 비밀번호 설정</h3>
        <div className="mt-2 flex gap-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="text"
            placeholder="새 비밀번호"
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || password.length < 4}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() =>
              startTransition(async () => {
                const res = await resetStudentPasswordAction(student.id, password);
                setMessage(res.error ?? res.success ?? null);
              })
            }
          >
            비밀번호 변경
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900">즉시 알림 발송</h3>
        <button
          type="button"
          disabled={pending}
          className="mt-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const res = await sendAdminNotificationAction(
                [student.id],
                "학습 점검 안내",
                `${student.displayName} 학생, 오늘 학습 진행 여부를 확인해 주세요.`,
              );
              setMessage(res.error ?? res.success ?? null);
            })
          }
        >
          이 학생에게 알림 보내기
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900">최근 14일 학습</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
          {detail.weeklyReviews.map((d) => (
            <div key={d.date} className="rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-2 text-center">
              <p className="text-[11px] text-zinc-500">{d.label}</p>
              <p className="text-sm font-bold text-zinc-900">{d.count}</p>
            </div>
          ))}
        </div>
      </section>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
