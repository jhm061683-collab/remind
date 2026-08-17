"use client";

import { useMemo, useState } from "react";
import type { AcademyAiQuotaSummary } from "@/lib/server/ai/academy-usage";

type Props = {
  summary: AcademyAiQuotaSummary | null;
};

function planLabel(code: string): string {
  if (code === "premium") return "Premium";
  if (code === "pro") return "Pro";
  if (code === "basic") return "Basic";
  return code || "플랜";
}

function Bar({
  used,
  total,
  tone,
}: {
  used: number;
  total: number;
  tone: "brand" | "warning";
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
  const fill =
    tone === "brand" ? "bg-[var(--rm-brand)]" : "bg-[var(--rm-warning)]";
  return (
    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--rm-surface)]">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AcademyAiQuotaPanel({ summary }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (!summary) {
    return (
      <section className="rm-glass rm-glass--compact">
        <p className="rm-label">학원 AI 이용량</p>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          구독 플랜이 없거나 AI가 포함되지 않은 요금제입니다.
        </p>
      </section>
    );
  }

  const monthLabel = summary.usageMonth.slice(0, 7);

  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="rm-label">학원 AI 이용량</p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            {monthLabel} · {planLabel(summary.planCode)} · 학생{" "}
            {summary.studentCount}명
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="shrink-0 rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--rm-nav-active)]"
        >
          상세 보기
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--rm-text)]">
              빠른 AI (월간)
            </p>
            <p className="text-sm font-bold text-[var(--rm-text)]">
              {summary.monthlyUsed.toLocaleString("ko-KR")}
              <span className="font-medium text-[var(--rm-text-muted)]">
                {" "}
                / {summary.monthlyLimitTotal.toLocaleString("ko-KR")}
              </span>
            </p>
          </div>
          <Bar
            used={summary.monthlyUsed}
            total={summary.monthlyLimitTotal}
            tone="brand"
          />
          <p className="mt-1 text-[11px] text-[var(--rm-text-muted)]">
            잔여 {summary.monthlyRemaining.toLocaleString("ko-KR")}건
          </p>
        </div>

        {summary.goldLimitTotal > 0 ? (
          <div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--rm-text)]">
                정밀 AI (골드)
              </p>
              <p className="text-sm font-bold text-[var(--rm-text)]">
                {summary.goldUsed.toLocaleString("ko-KR")}
                <span className="font-medium text-[var(--rm-text-muted)]">
                  {" "}
                  / {summary.goldLimitTotal.toLocaleString("ko-KR")}
                </span>
              </p>
            </div>
            <Bar
              used={summary.goldUsed}
              total={summary.goldLimitTotal}
              tone="warning"
            />
            <p className="mt-1 text-[11px] text-[var(--rm-text-muted)]">
              잔여 {summary.goldRemaining.toLocaleString("ko-KR")}건
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <RankList
          title="학년 이용 랭킹"
          rows={summary.gradeRanking.map((g) => ({
            label: g.gradeLabel,
            value: g.used,
          }))}
        />
        <RankList
          title="반 이용 랭킹"
          rows={summary.classRanking.map((c) => ({
            label: c.className,
            value: c.used,
          }))}
        />
      </div>

      {detailOpen ? (
        <AiUsageDetailModal
          summary={summary}
          monthLabel={monthLabel}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </section>
  );
}

function AiUsageDetailModal({
  summary,
  monthLabel,
  onClose,
}: {
  summary: AcademyAiQuotaSummary;
  monthLabel: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"grade" | "class" | "student">("grade");

  const chartRows = useMemo(() => {
    if (tab === "grade") {
      return summary.byGrade.map((g) => ({
        label: g.gradeLabel,
        used: g.used,
        gold: g.goldUsed,
      }));
    }
    if (tab === "class") {
      return summary.byClass.map((c) => ({
        label: `${c.className}${c.gradeLabel ? ` · ${c.gradeLabel}` : ""}`,
        used: c.used,
        gold: c.goldUsed,
      }));
    }
    return summary.byStudent.map((s) => ({
      label: `${s.displayName}${s.className ? ` · ${s.className}` : ""}`,
      used: s.used,
      gold: s.goldUsed,
    }));
  }, [summary, tab]);

  const maxUsed = Math.max(1, ...chartRows.map((r) => r.used));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-[var(--rm-shadow-soft)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--rm-border)] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[var(--rm-text)]">
              AI 이용량 상세
            </p>
            <p className="text-[11px] text-[var(--rm-text-muted)]">
              {monthLabel} · 학년별 → 반별 → 학생별
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--rm-text-muted)]"
          >
            닫기
          </button>
        </div>

        <div className="flex gap-1 border-b border-[var(--rm-border)] px-3 py-2">
          {(
            [
              ["grade", "학년별"],
              ["class", "반별"],
              ["student", "학생별"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                tab === key
                  ? "bg-[var(--rm-brand)] text-white"
                  : "text-[var(--rm-text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div>
            <p className="mb-2 text-[11px] font-bold text-[var(--rm-text-muted)]">
              이용량 차트
            </p>
            {chartRows.length === 0 ? (
              <p className="text-xs text-[var(--rm-text-faint)]">데이터 없음</p>
            ) : (
              <ul className="space-y-2">
                {chartRows.slice(0, 20).map((row) => {
                  const pct = Math.round((row.used / maxUsed) * 100);
                  return (
                    <li key={row.label}>
                      <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate font-medium text-[var(--rm-text)]">
                          {row.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-[var(--rm-text-muted)]">
                          {row.used}건
                          {row.gold > 0 ? ` · 골드 ${row.gold}` : ""}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--rm-bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--rm-brand)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold text-[var(--rm-text-muted)]">
              표
            </p>
            <div className="overflow-hidden rounded-xl border border-[var(--rm-border)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--rm-bg-elevated)] text-[var(--rm-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">이름</th>
                    <th className="px-3 py-2 font-semibold tabular-nums">빠른 AI</th>
                    <th className="px-3 py-2 font-semibold tabular-nums">골드</th>
                  </tr>
                </thead>
                <tbody>
                  {chartRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-4 text-center text-[var(--rm-text-faint)]"
                      >
                        없음
                      </td>
                    </tr>
                  ) : (
                    chartRows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-t border-[var(--rm-border)]"
                      >
                        <td className="max-w-[14rem] truncate px-3 py-2 text-[var(--rm-text)]">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--rm-text)]">
                          {row.used}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--rm-text-muted)]">
                          {row.gold}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] p-2.5">
      <p className="text-[11px] font-bold text-[var(--rm-text-muted)]">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-[var(--rm-text-faint)]">데이터 없음</p>
      ) : (
        <ol className="mt-1.5 space-y-1">
          {rows.map((row, index) => (
            <li
              key={`${row.label}-${index}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate text-[var(--rm-text)]">
                <span className="mr-1 font-bold text-[var(--rm-brand)]">
                  {index + 1}.
                </span>
                {row.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[var(--rm-text-muted)]">
                {row.value}건
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
