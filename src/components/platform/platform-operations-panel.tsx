"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { PlatformOperationsOverview } from "@/lib/server/platform/operations";

type Props = {
  overview: PlatformOperationsOverview;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ko-KR");
  } catch {
    return "—";
  }
}

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function statusBadge(status: string) {
  const tone =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "trial"
        ? "bg-sky-100 text-sky-800"
        : status === "suspended"
          ? "bg-rose-100 text-rose-800"
          : "bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]";
  const label =
    status === "active"
      ? "운영"
      : status === "trial"
        ? "체험"
        : status === "suspended"
          ? "정지"
          : status;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

/** owner — 원장·학원 운영 현황 */
export function PlatformOperationsPanel({ overview }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { directors, academies, totals } = overview;

  useEffect(() => {
    const id = window.setInterval(() => {
      start(() => router.refresh());
    }, 60_000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">원장 · 학원 운영 현황</h2>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            가입 원장 연락처와 학원별 학습·AI 사용을 한눈에 봅니다. 출석·복습은
            KST 기준 오늘/이번 주입니다.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => router.refresh())}
          className="shrink-0 rounded-lg border border-[var(--rm-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--rm-surface-raised)] disabled:opacity-60"
        >
          {pending ? "갱신 중…" : "지금 새로고침"}
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="학원" value={totals.academyCount} suffix="곳" />
        <StatCard label="원장" value={totals.directorCount} suffix="명" />
        <StatCard label="재원 학생" value={totals.studentCount} suffix="명" />
        <StatCard
          label="오늘 접속·복습"
          value={totals.activeStudentsToday}
          suffix="명"
        />
        <StatCard label="오늘 복습" value={totals.reviewsToday} suffix="회" />
      </div>

      <h3 className="mb-2 text-xs font-semibold text-[var(--rm-text-muted)]">
        원장 계정 ({directors.length})
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--rm-border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">원장</th>
              <th className="px-3 py-2 font-medium">학원</th>
              <th className="px-3 py-2 font-medium">연락처</th>
              <th className="px-3 py-2 font-medium">복구 이메일</th>
              <th className="px-3 py-2 font-medium">학생</th>
              <th className="px-3 py-2 font-medium">가입</th>
              <th className="px-3 py-2 font-medium">마지막 로그인</th>
            </tr>
          </thead>
          <tbody>
            {directors.map((d) => (
              <tr
                key={d.userId}
                className="border-b border-[var(--rm-border)] last:border-0"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium">{d.displayName}</p>
                  <p className="text-[10px] text-[var(--rm-text-faint)]">
                    @{d.username}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <p>{d.academyName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--rm-text-faint)]">
                      {d.academyCode}
                    </span>
                    {statusBadge(d.academyStatus)}
                  </p>
                </td>
                <td className="px-3 py-2.5">{formatPhone(d.phone)}</td>
                <td className="px-3 py-2.5 break-all">{d.recoveryEmail ?? "—"}</td>
                <td className="px-3 py-2.5">{d.studentCount}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {formatDate(d.joinedAt)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {formatDateTime(d.lastLoginAt)}
                </td>
              </tr>
            ))}
            {directors.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-[var(--rm-text-muted)]"
                >
                  등록된 원장이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold text-[var(--rm-text-muted)]">
        학원별 운영 ({academies.length})
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--rm-border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">학원</th>
              <th className="px-3 py-2 font-medium">원장</th>
              <th className="px-3 py-2 font-medium">규모</th>
              <th className="px-3 py-2 font-medium">오늘 활동</th>
              <th className="px-3 py-2 font-medium">복습</th>
              <th className="px-3 py-2 font-medium">문항</th>
              <th className="px-3 py-2 font-medium">AI(월)</th>
              <th className="px-3 py-2 font-medium">마지막 학습</th>
            </tr>
          </thead>
          <tbody>
            {academies.map((a) => (
              <tr
                key={a.academyId}
                className="border-b border-[var(--rm-border)] last:border-0"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium">{a.academyName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--rm-text-faint)]">
                      {a.academyCode}
                    </span>
                    {statusBadge(a.status)}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  {a.directorName ? (
                    <>
                      <p>{a.directorName}</p>
                      {a.directorUsername ? (
                        <p className="text-[10px] text-[var(--rm-text-faint)]">
                          @{a.directorUsername}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] text-[var(--rm-text-muted)]">
                        로그인 {formatDateTime(a.directorLastLoginAt)}
                      </p>
                    </>
                  ) : (
                    <span className="text-[var(--rm-text-muted)]">미배정</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <p>
                    학생 {a.activeStudentCount}
                    {a.studentCount !== a.activeStudentCount
                      ? ` / ${a.studentCount}`
                      : ""}
                  </p>
                  <p className="text-[10px] text-[var(--rm-text-muted)]">
                    반 {a.classCount} · 선생 {a.staffCount}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{a.activeStudentsToday}명</p>
                  <p className="text-[10px] text-[var(--rm-text-muted)]">
                    접속 또는 복습
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <p>오늘 {a.reviewsToday}</p>
                  <p className="text-[10px] text-[var(--rm-text-muted)]">
                    주 {a.reviewsThisWeek}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <p>활성 {a.activeQuestions}</p>
                  <p className="text-[10px] text-[var(--rm-text-muted)]">
                    이번 달 +{a.questionsAddedThisMonth}
                  </p>
                </td>
                <td className="px-3 py-2.5">
                  <p>{a.aiCallsThisMonth}회</p>
                  <p className="text-[10px] text-[var(--rm-text-muted)]">
                    ≈ {a.aiCostKrwThisMonth.toLocaleString("ko-KR")}원
                  </p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {formatDateTime(a.lastStudentActivityAt)}
                </td>
              </tr>
            ))}
            {academies.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[var(--rm-text-muted)]"
                >
                  등록된 학원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2.5">
      <p className="text-[11px] font-medium text-[var(--rm-text-muted)]">{label}</p>
      <p className="mt-0.5 text-xl font-bold">
        {value.toLocaleString("ko-KR")}
        <span className="ml-0.5 text-sm font-medium text-[var(--rm-text-muted)]">
          {suffix}
        </span>
      </p>
    </div>
  );
}
