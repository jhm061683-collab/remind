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
import { ParentReportGenerator } from "@/components/admin/parent-report-generator";
import { formatDateTime } from "@/lib/utils/labels";
import { describeStaffing } from "@/lib/admin/staff-relation";
import { categorizeWrongReason } from "@/lib/archive/wrong-reason-category";
import type { StudentDetailData } from "@/lib/types/admin";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const WrongNotePacketPanel = dynamic(
  () =>
    import("@/components/admin/wrong-note-packet-panel").then(
      (m) => m.WrongNotePacketPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 text-sm text-[var(--rm-text-muted)]">
        오답모음 PDF 불러오는 중…
      </div>
    ),
  },
);

type Props = {
  detail: StudentDetailData;
  canManageAccount: boolean;
};

type DetailTab = "summary" | "learning" | "reports" | "account";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "summary", label: "요약·상담" },
  { id: "learning", label: "학습·오답" },
  { id: "reports", label: "보고서·PDF" },
  { id: "account", label: "계정·권한" },
];

export function StudentDetailPanel({ detail, canManageAccount }: Props) {
  const router = useRouter();
  const student = detail.student;
  const [phone, setPhone] = useState(student.phone ?? "");
  const [schoolLevel, setSchoolLevel] = useState(student.schoolLevel ?? "middle");
  const [gradeNumber, setGradeNumber] = useState(student.gradeNumber ?? 1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [preferGpt4o, setPreferGpt4o] = useState(
    detail.aiEngine?.preferGpt4o ?? false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");

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

      <ConfirmDialog
        open={showResetConfirm}
        title="임시 비밀번호를 만들까요?"
        description={`「${student.displayName}」 학생은 기존 비밀번호로 로그인할 수 없게 됩니다. 임시 비밀번호는 지금 한 번만 보여 주고 저장되지 않습니다.`}
        confirmLabel="임시 비밀번호 만들기"
        cancelLabel="취소"
        loading={pending}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          startTransition(async () => {
            const res = await resetStudentPasswordAction(student.id);
            setShowResetConfirm(false);
            setMessage(res.error ?? res.success ?? null);
            setTemporaryPassword(res.temporaryPassword ?? null);
          });
        }}
      />

      <div
        role="tablist"
        aria-label="학생 상세 메뉴"
        className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-1 sm:grid-cols-4"
      >
        {DETAIL_TABS.filter(
          (tab) => tab.id !== "account" || canManageAccount,
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`student-detail-${tab.id}-tab`}
            aria-selected={activeTab === tab.id}
            aria-controls={`student-detail-${tab.id}`}
            data-tour-id={tab.id === "reports" ? "admin-packet-pdf" : undefined}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] rounded-lg px-2 text-[13px] font-bold transition sm:text-sm ${
              activeTab === tab.id
                ? "bg-[var(--rm-surface)] text-[var(--rm-nav-active)] shadow-sm"
                : "text-[var(--rm-text-muted)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? (
      <div id="student-detail-summary" role="tabpanel" aria-labelledby="student-detail-summary-tab" className="space-y-4">
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--rm-text)]">
              {student.displayName}
            </h2>
            <p className="text-sm text-[var(--rm-text-muted)]">
              아이디 {student.username} · 마지막 로그인{" "}
              {formatDateTime(student.lastLoginAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {student.dueToday > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                오늘 복습 {student.dueToday}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                오늘 복습 없음
              </span>
            )}
            {student.inactiveDays >= 7 ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                {student.inactiveDays}일 미접속
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryStat
            label="오늘 복습"
            value={`${student.dueToday}`}
            hint="대기 문제"
          />
          <SummaryStat
            label="오늘 완료"
            value={`${student.reviewedToday}`}
            hint="다시 푼 횟수"
          />
          <SummaryStat
            label="연속 출석"
            value={`${student.loginStreakDays}일`}
            hint={
              student.inactiveDays > 0
                ? `${student.inactiveDays}일 전 접속`
                : "오늘 접속"
            }
          />
          <SummaryStat
            label="취약 신호"
            value={
              detail.topWeaknesses[0]
                ? categorizeWrongReason(detail.topWeaknesses[0].reason)
                : "—"
            }
            hint={
              detail.topWeaknesses[0]
                ? `${detail.topWeaknesses[0].count}회`
                : "데이터 부족"
            }
          />
        </div>

        <div className="mt-3 rounded-xl bg-[var(--rm-surface-raised)] px-3 py-2 text-sm text-[var(--rm-text)]">
          <p>
            <span className="font-medium">소속 반:</span> {classDisplay}
          </p>
          <p className="mt-1">
            <span className="font-medium">담당:</span>{" "}
            {
              describeStaffing({
                teacherNames: student.teacherNames,
                subAdminName: student.subAdminName,
              }).label
            }
          </p>
          <Link
            href="/admin/classes"
            className="mt-2 inline-block text-xs font-semibold text-[var(--rm-nav-active)] hover:underline"
          >
            반 설정에서 배정 변경 →
          </Link>
        </div>
        {canManageAccount ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[13px] font-semibold text-[var(--rm-text-muted)]">
            휴대폰
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="학생 휴대폰"
            placeholder="휴대폰"
            className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold text-[var(--rm-text-muted)]">
            학교급
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
          </label>
          <label className="grid gap-1 text-[13px] font-semibold text-[var(--rm-text-muted)]">
            학년
          <input
            type="number"
            min={1}
            max={10}
            value={gradeNumber}
            onChange={(e) => setGradeNumber(Number(e.target.value))}
            className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
          </label>
        </div>
        ) : null}
        {canManageAccount ? (
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
        ) : null}
      </section>
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--rm-text)]">즉시 알림 발송</h3>
        <p className="mt-1 text-[13px] text-[var(--rm-text-muted)]">
          학생 한 명에게 학습 점검 안내를 보냅니다.
        </p>
        <button
          type="button"
          disabled={pending}
          className="mt-3 min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
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
      </div>
      ) : null}

      {activeTab === "reports" ? (
      <div id="student-detail-reports" role="tabpanel" aria-labelledby="student-detail-reports-tab" className="space-y-4">
        <ParentReportGenerator
          studentId={student.id}
          studentName={student.displayName}
        />
        <WrongNotePacketPanel
          studentId={student.id}
          studentName={student.displayName}
        />
      </div>
      ) : null}

      {activeTab === "account" && canManageAccount ? (
      <div id="student-detail-account" role="tabpanel" aria-labelledby="student-detail-account-tab" className="space-y-4">
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="font-semibold text-[var(--rm-text)]">비밀번호</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--rm-text-muted)]">
          현재 비밀번호는 확인할 수 없습니다. 잊은 경우 임시 비밀번호를 만들고,
          학생에게 직접 알려 주세요. 24시간 안에 로그인해서 새 비밀번호로 바꾸게
          됩니다.
        </p>
        {temporaryPassword ? (
          <p
            className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-3 py-2 text-sm text-[var(--rm-text)]"
            role="status"
          >
            이번만 보이는 임시 비밀번호:{" "}
            <span className="font-mono tracking-wide">{temporaryPassword}</span>
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending}
          className="mt-3 rounded-xl bg-[var(--rm-text)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => setShowResetConfirm(true)}
        >
          임시 비밀번호 만들기
        </button>
      </section>

      {detail.aiEngine?.academyPlanCode === "premium" ? (
        <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--rm-text)]">
            AI 정리 기본 선택
          </h3>
          <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
            학생이 등록할 때 직접 정리 방식을 고를 수 있습니다. 여기서는 처음
            표시할 기본 선택만 정합니다.
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
              {preferGpt4o ? "정밀 AI 정리 우선" : "빠른 AI 정리 우선"}
            </span>
          </label>
        </section>
      ) : null}
      <section className="rounded-2xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] p-4">
        <h3 className="font-semibold text-[var(--rm-text-on-error)]">계정 삭제</h3>
        <p className="mt-1 text-xs text-[var(--rm-text-on-error)]/80">
          로그인 계정과 이 학생의 문제·학습 기록이 모두 삭제됩니다.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowDeleteConfirm(true)}
          className="mt-3 min-h-[44px] rounded-xl border border-red-300 bg-[var(--rm-surface)] px-4 text-sm font-semibold text-[var(--rm-text-on-error)] disabled:opacity-50"
        >
          이 학생 계정 삭제
        </button>
      </section>
      </div>
      ) : null}

      {activeTab === "learning" ? (
      <div id="student-detail-learning" role="tabpanel" aria-labelledby="student-detail-learning-tab" className="space-y-4">
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--rm-text)]">최근 14일 학습</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
          {detail.weeklyReviews.map((d) => (
            <div key={d.date} className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-2 py-2 text-center">
              <p className="text-[11px] text-[var(--rm-text-muted)]">{d.label}</p>
              <p className="text-sm font-bold text-[var(--rm-text)]">{d.count}</p>
            </div>
          ))}
        </div>
      </section>
      </div>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-[var(--rm-accent-muted)] px-3 py-2 text-sm text-[var(--rm-text)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--rm-surface-raised)] px-3 py-2.5">
      <p className="text-xs font-semibold text-[var(--rm-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-[var(--rm-text)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-xs text-[var(--rm-text-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
