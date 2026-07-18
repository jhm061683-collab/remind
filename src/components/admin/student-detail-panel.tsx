"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteStudentsAction,
  resetStudentPasswordAction,
  saveStudentDetailAction,
  sendAdminNotificationAction,
  setStudentAiEnginePreferenceAction,
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
  const [preferGpt4o, setPreferGpt4o] = useState(
    detail.aiEngine?.preferGpt4o ?? true,
  );
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

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--rm-text)]">{student.displayName}</h2>
        <p className="text-sm text-[var(--rm-text-muted)]">
          아이디 {student.username} · 마지막 로그인 {student.lastLoginAt ?? "없음"}
        </p>
        <div className="mt-3 rounded-xl bg-[var(--rm-surface-raised)] px-3 py-2 text-sm text-[var(--rm-text)]">
          <p>
            <span className="font-medium">소속 반:</span> {classDisplay}
          </p>
          <p className="mt-1">
            <span className="font-medium">담당 선생님:</span>{" "}
            {student.teacherNames.join(", ") || "미배정"}
          </p>
          <Link
            href="/admin/classes"
            className="mt-2 inline-block text-xs font-semibold text-[var(--rm-nav-active)] hover:underline"
          >
            반 관리에서 배정 변경 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="휴대폰"
            className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
          <select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value as typeof schoolLevel)}
            className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
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
            className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          className="mt-3 rounded-xl rm-fill-brand px-4 py-2 text-sm font-semibold disabled:opacity-50"
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

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="font-semibold text-[var(--rm-text)]">비밀번호</h3>
        <p className="mt-2 rounded-xl bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-3 py-2 text-sm text-[var(--rm-text)]">
          <span className="font-semibold">현재 기록된 비밀번호: </span>
          {student.passwordPlain ? (
            <span className="font-mono tracking-wide">{student.passwordPlain}</span>
          ) : (
            <span className="text-[var(--rm-text)]/80">
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
            className="flex-1 rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || password.length < 4}
            className="rounded-xl bg-[var(--rm-text)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
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

      {detail.aiEngine?.academyPlanCode === "premium" ? (
        <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--rm-text)]">
            AI 엔진 설정 (Premium)
          </h3>
          <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
            켜면 GPT-4o 골드 티켓(월 100건)이 남아 있을 때 GPT-4o를 먼저
            씁니다. 끄면 골드 티켓을 아끼고 Gemini만 씁니다.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={preferGpt4o}
              disabled={pending}
              onClick={() => {
                const next = !preferGpt4o;
                setPreferGpt4o(next);
                startTransition(async () => {
                  const res = await setStudentAiEnginePreferenceAction(
                    student.id,
                    next,
                  );
                  if (res.error) {
                    setPreferGpt4o(!next);
                  }
                  setMessage(res.error ?? res.success ?? null);
                });
              }}
              className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                preferGpt4o ? "bg-blue-600" : "bg-[var(--rm-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  preferGpt4o ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-[var(--rm-text)]">
              {preferGpt4o ? "GPT-4o 우선 (골드 티켓 사용)" : "Gemini만 사용"}
            </span>
          </label>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="font-semibold text-[var(--rm-text)]">즉시 알림 발송</h3>
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

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="font-semibold text-[var(--rm-text)]">최근 14일 학습</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
          {detail.weeklyReviews.map((d) => (
            <div key={d.date} className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-2 py-2 text-center">
              <p className="text-[11px] text-[var(--rm-text-muted)]">{d.label}</p>
              <p className="text-sm font-bold text-[var(--rm-text)]">{d.count}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] p-4">
        <h3 className="font-semibold text-[var(--rm-text-on-error)]">계정 삭제</h3>
        <p className="mt-1 text-xs text-[var(--rm-text-on-error)]/80">
          로그인 계정과 이 학생의 문제·학습 기록이 모두 삭제됩니다.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowDeleteConfirm(true)}
          className="mt-3 rounded-xl border border-red-300 bg-[var(--rm-surface)] px-4 py-2 text-sm font-semibold text-[var(--rm-text-on-error)] disabled:opacity-50"
        >
          이 학생 계정 삭제
        </button>
      </section>

      {message ? <p className="text-sm text-[var(--rm-text-muted)]">{message}</p> : null}
    </div>
  );
}
