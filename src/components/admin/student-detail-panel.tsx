"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteStudentsAction,
  resetStudentPasswordAction,
  saveStudentDetailAction,
  sendAdminNotificationAction,
} from "@/lib/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StudentDetailData } from "@/lib/types/admin";
import { useRouter } from "next/navigation";

type Props = {
  detail: StudentDetailData;
};

export function StudentDetailPanel({ detail }: Props) {
  const router = useRouter();
  const student = detail.student;
  const [phone, setPhone] = useState(student.phone ?? "");
  const [schoolLevel, setSchoolLevel] = useState(student.schoolLevel ?? "middle");
  const [gradeNumber, setGradeNumber] = useState(student.gradeNumber ?? 1);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const classDisplay =
    student.classNames.length > 0
      ? student.classNames.join(", ")
      : student.className ?? "없음";

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={showDeleteConfirm}
        title="이 학생 계정을 삭제할까요?"
        description={`「${student.displayName}」 계정과 학습 기록이 모두 지워지고 되돌릴 수 없어요.`}
        confirmLabel="계정 삭제"
        cancelLabel="취소"
        variant="danger"
        loading={pending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          startTransition(async () => {
            const res = await deleteStudentsAction([student.id]);
            if (res.error) {
              setMessage(res.error);
              setShowDeleteConfirm(false);
              return;
            }
            router.push("/admin/students");
            router.refresh();
          });
        }}
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">{student.displayName}</h2>
        <p className="text-sm text-zinc-500">
          아이디 {student.username} · 마지막 로그인 {student.lastLoginAt ?? "없음"}
        </p>
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>
            <span className="font-medium">소속 반:</span> {classDisplay}
          </p>
          <p className="mt-1">
            <span className="font-medium">담당 선생님:</span>{" "}
            {student.teacherNames.join(", ") || "미배정"}
          </p>
          <Link
            href="/admin/classes"
            className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
          >
            반 관리에서 배정 변경 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="휴대폰"
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
        <button
          type="button"
          disabled={pending}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const res = await saveStudentDetailAction(student.id, {
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
        <h3 className="font-semibold text-zinc-900">비밀번호</h3>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">현재 기록된 비밀번호: </span>
          {student.passwordPlain ? (
            <span className="font-mono tracking-wide">{student.passwordPlain}</span>
          ) : (
            <span className="text-amber-800/80">
              아직 없음 (학생이 변경하거나 아래에서 재설정하면 표시됩니다)
            </span>
          )}
        </p>
        <div className="mt-3 flex gap-2">
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
                if (res.success) setPassword("");
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

      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
        <h3 className="font-semibold text-red-800">계정 삭제</h3>
        <p className="mt-1 text-xs text-red-700/80">
          로그인 계정과 이 학생의 문제·학습 기록이 모두 삭제됩니다.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowDeleteConfirm(true)}
          className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          이 학생 계정 삭제
        </button>
      </section>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
