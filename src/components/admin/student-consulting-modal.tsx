"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getConsultingSnapshotAction } from "@/lib/actions/consulting";
import { createParentReportAction } from "@/lib/actions/parent-reports";
import type { ConsultingSnapshot } from "@/lib/server/admin/consulting-snapshot";
import type { ConsultingPeriodPreset } from "@/lib/utils/date-range";

type Props = {
  open: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
};

const PERIOD_OPTIONS: Array<{ value: ConsultingPeriodPreset; label: string }> = [
  { value: "7d", label: "최근 7일" },
  { value: "14d", label: "최근 14일" },
  { value: "30d", label: "최근 30일" },
  { value: "month", label: "이번 달" },
];

const LIGHT_STYLES: Record<
  ConsultingSnapshot["trafficLight"],
  { badge: string; emoji: string }
> = {
  green: {
    emoji: "🟢",
    badge:
      "border-[color-mix(in_srgb,var(--rm-success)_35%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-success)_14%,var(--rm-surface))] text-[var(--rm-success)]",
  },
  yellow: {
    emoji: "🟡",
    badge:
      "border-[color-mix(in_srgb,var(--rm-warning)_35%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-warning)_14%,var(--rm-surface))] text-[var(--rm-warning)]",
  },
  red: {
    emoji: "🔴",
    badge:
      "border-[color-mix(in_srgb,var(--rm-danger)_35%,var(--rm-border))] bg-[color-mix(in_srgb,var(--rm-danger)_14%,var(--rm-surface))] text-[var(--rm-danger)]",
  },
};

const REASON_COLORS = {
  calc: "bg-[var(--rm-warning)]",
  concept: "bg-[var(--rm-brand)]",
  misread: "bg-[var(--rm-danger)]",
} as const;

export function StudentConsultingModal({
  open,
  studentId,
  studentName,
  onClose,
}: Props) {
  const [period, setPeriod] = useState<ConsultingPeriodPreset>("14d");
  const [subjectId, setSubjectId] = useState<string | "all">("all");
  const [snapshot, setSnapshot] = useState<ConsultingSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [reportPending, startReport] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMessage(null);
    setReportPath(null);
    startLoad(async () => {
      const result = await getConsultingSnapshotAction({
        studentId,
        period,
        subjectId,
      });
      if (result.error || !result.snapshot) {
        setSnapshot(null);
        setError(result.error ?? "불러오지 못했습니다.");
        return;
      }
      setSnapshot(result.snapshot);
    });
  }, [open, studentId, period, subjectId]);

  if (!open) return null;

  function absoluteUrl(path: string): string {
    return new URL(path, window.location.origin).toString();
  }

  function createAndCopyReport() {
    setMessage(null);
    const days = snapshot?.periodDays ?? 14;
    startReport(async () => {
      const result = await createParentReportAction({
        studentId,
        periodDays: Math.max(7, days),
      });
      if (result.error || !result.path) {
        setMessage(result.error ?? "보고서를 만들지 못했습니다.");
        return;
      }
      setReportPath(result.path);
      const url = absoluteUrl(result.path);
      try {
        await navigator.clipboard.writeText(url);
        setMessage("학부모 공유 링크를 복사했습니다.");
      } catch {
        window.prompt("아래 링크를 복사해 주세요.", url);
        setMessage("링크를 만들었습니다. 복사해 전달해 주세요.");
      }
    });
  }

  const light = snapshot ? LIGHT_STYLES[snapshot.trafficLight] : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consulting-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-[var(--rm-shadow-soft)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[var(--rm-border)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--rm-text-muted)]">
                학부모 상담 3초 스냅샷
              </p>
              <h2
                id="consulting-modal-title"
                className="mt-0.5 truncate text-lg font-bold text-[var(--rm-text)]"
              >
                {studentName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--rm-text-muted)] hover:bg-[var(--rm-surface-raised)]"
            >
              닫기
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-[var(--rm-text-muted)]">
              기간
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as ConsultingPeriodPreset)
                }
                className="mt-1 w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--rm-text)]"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[var(--rm-text-muted)]">
              과목
              <select
                value={subjectId}
                onChange={(event) =>
                  setSubjectId(
                    event.target.value === "all" ? "all" : event.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--rm-text)]"
              >
                <option value="all">전체</option>
                {(snapshot?.subjectOptions ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.count})
                  </option>
                ))}
                {/* 기본 과목도 항상 선택 가능하게 둠 */}
                {["math", "english", "korean"].map((id) => {
                  if (snapshot?.subjectOptions.some((s) => s.id === id)) {
                    return null;
                  }
                  const names: Record<string, string> = {
                    math: "수학",
                    english: "영어",
                    korean: "국어",
                  };
                  return (
                    <option key={id} value={id}>
                      {names[id]}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loading && !snapshot ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-2xl bg-[var(--rm-surface-raised)]" />
              <div className="h-24 rounded-2xl bg-[var(--rm-surface-raised)]" />
              <div className="h-20 rounded-2xl bg-[var(--rm-surface-raised)]" />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-[var(--rm-danger)]/30 bg-[color-mix(in_srgb,var(--rm-danger)_10%,var(--rm-surface))] px-3 py-2 text-sm text-[var(--rm-danger)]">
              {error}
            </p>
          ) : null}

          {snapshot && light ? (
            <>
              <div
                className={`rounded-2xl border px-4 py-3 ${light.badge}`}
              >
                <p className="text-sm font-bold">
                  {light.emoji} {snapshot.trafficLabel}
                </p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {snapshot.periodLabel}
                  {snapshot.subjectId !== "all"
                    ? ` · ${snapshot.subjectOptions.find((s) => s.id === snapshot.subjectId)?.name ?? "과목"}`
                    : " · 전체 과목"}{" "}
                  기준 한눈에 보기
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricTile
                  label="복습 성실도"
                  value={
                    snapshot.reviewFidelityPct === null
                      ? "—"
                      : `${snapshot.reviewFidelityPct}%`
                  }
                  hint="예정 대비 다시 푼 비율"
                />
                <MetricTile
                  label="오답 정복률"
                  value={`${snapshot.masteryPct}%`}
                  hint={`${snapshot.completedQuestions}/${snapshot.totalQuestions}개 정복`}
                />
              </div>

              <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-4 py-3">
                <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                  취약 단원 한 줄 요약
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--rm-text)]">
                  {snapshot.weaknessLine}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-4 py-3">
                <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                  오답 원인 비중
                </p>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[var(--rm-surface)]">
                  {snapshot.reasonBuckets.every((b) => b.percent === 0) ? (
                    <div className="h-full w-full bg-[var(--rm-border)]" />
                  ) : (
                    snapshot.reasonBuckets.map((bucket) =>
                      bucket.percent > 0 ? (
                        <div
                          key={bucket.key}
                          className={REASON_COLORS[bucket.key]}
                          style={{ width: `${bucket.percent}%` }}
                          title={`${bucket.label} ${bucket.percent}%`}
                        />
                      ) : null,
                    )
                  )}
                </div>
                <ul className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
                  {snapshot.reasonBuckets.map((bucket) => (
                    <li key={bucket.key} className="text-[var(--rm-text-muted)]">
                      <span
                        className={`mr-1 inline-block h-2 w-2 rounded-full ${REASON_COLORS[bucket.key]}`}
                      />
                      {bucket.label}
                      <br />
                      <span className="font-bold text-[var(--rm-text)]">
                        {bucket.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>

        <footer className="shrink-0 space-y-2 border-t border-[var(--rm-border)] px-4 py-3">
          {message ? (
            <p className="text-xs font-medium text-[var(--rm-text-muted)]">
              {message}
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={reportPending || !snapshot}
              onClick={createAndCopyReport}
              className="min-h-[48px] rounded-xl bg-[var(--rm-brand)] px-4 py-3 text-sm font-bold text-white touch-manipulation disabled:opacity-50"
            >
              {reportPending
                ? "링크 만드는 중…"
                : "보고서 링크 생성 · 복사"}
            </button>
            <Link
              href={`/admin/students/${studentId}`}
              className="flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--rm-border)] px-4 py-3 text-sm font-semibold text-[var(--rm-text)] touch-manipulation"
              onClick={onClose}
            >
              상세 · 오답 모음 PDF
            </Link>
          </div>
          {reportPath ? (
            <a
              href={reportPath}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs font-semibold text-[var(--rm-nav-active)]"
            >
              생성된 보고서 열기
            </a>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-3">
      <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--rm-text)]">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--rm-text-subtle)]">{hint}</p>
    </div>
  );
}
