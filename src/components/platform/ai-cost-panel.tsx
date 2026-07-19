"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { AiCostBucket, AiCostSummary } from "@/lib/server/ai/cost";

type Props = {
  summary: AiCostSummary;
};

function formatWon(value: number): string {
  if (!Number.isFinite(value)) return "0원";
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}원`;
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString("ko-KR");
}

function CostTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: AiCostBucket[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-xs font-bold text-amber-950">{title}</h3>
        <p className="mt-1 text-xs text-amber-800/70">{empty}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-xs font-bold text-amber-950">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
        <table className="min-w-full text-left text-[11px] text-amber-950">
          <thead className="border-b border-amber-100 bg-amber-50/80 text-amber-800">
            <tr>
              <th className="px-3 py-2 font-semibold">구분</th>
              <th className="px-3 py-2 font-semibold">호출</th>
              <th className="px-3 py-2 font-semibold">문항</th>
              <th className="px-3 py-2 font-semibold">입력 토큰</th>
              <th className="px-3 py-2 font-semibold">출력 토큰</th>
              <th className="px-3 py-2 font-semibold">합계</th>
              <th className="px-3 py-2 font-semibold">건당</th>
              <th className="px-3 py-2 font-semibold">문항당</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-amber-50 last:border-0">
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">{row.calls.toLocaleString("ko-KR")}</td>
                <td className="px-3 py-2">
                  {row.problems.toLocaleString("ko-KR")}
                </td>
                <td className="px-3 py-2">{formatTokens(row.promptTokens)}</td>
                <td className="px-3 py-2">
                  {formatTokens(row.outputTokens + row.thoughtsTokens)}
                </td>
                <td className="px-3 py-2 font-semibold">{formatWon(row.krw)}</td>
                <td className="px-3 py-2">{formatWon(row.avgKrwPerCall)}</td>
                <td className="px-3 py-2">{formatWon(row.avgKrwPerProblem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Owner 전용 — AI API 예상 지출 + 과목별 단가 분석 */
export function AiCostPanel({ summary }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      start(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  const hasData = summary.monthCalls > 0;

  return (
    <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-950">
            AI API 예상 지출 · 과목별 단가
          </h2>
          <p className="mt-0.5 text-xs text-amber-800/80">
            앱이 기록한 토큰으로 환산한 추정값입니다. 요금 책정 시 「문항당」
            단가를 참고하세요. 실제 Google/OpenAI 청구와 ±20% 정도 차이가 날 수
            있어요.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => router.refresh())}
          className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-60"
        >
          {pending ? "갱신 중…" : "지금 새로고침"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-amber-800">오늘</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">
            {formatWon(summary.todayKrw)}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700/80">
            {summary.todayCalls.toLocaleString("ko-KR")}회 호출
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-amber-800">이번 달</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">
            {formatWon(summary.monthKrw)}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700/80">
            {summary.monthCalls.toLocaleString("ko-KR")}회 호출
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-amber-800">호출당 평균</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">
            {formatWon(summary.avgKrwPerCall)}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700/80">이번 달 기준</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-amber-800">이번 달 토큰</p>
          <p className="mt-1 text-lg font-bold text-amber-950">
            입 {formatTokens(summary.monthPromptTokens)}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700/80">
            출{" "}
            {formatTokens(
              summary.monthOutputTokens + summary.monthThoughtsTokens,
            )}
          </p>
        </div>
      </div>

      {hasData ? (
        <>
          <CostTable
            title="과목별 (요금 책정용)"
            rows={summary.bySubject}
            empty="아직 과목 기록이 없습니다."
          />
          <CostTable
            title="엔진별"
            rows={summary.byEngine}
            empty="아직 엔진 기록이 없습니다."
          />
        </>
      ) : (
        <p className="mt-3 text-xs text-amber-800/70">
          아직 기록된 AI 호출이 없습니다. Supabase에{" "}
          <code className="rounded bg-white px-1">030_ai_cost_subject_analytics.sql</code>{" "}
          을 실행한 뒤, 학생이 AI로 문제를 읽으면 과목별로 쌓입니다.
        </p>
      )}

      <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 px-3 py-3 text-[11px] leading-5 text-amber-900">
        <p className="font-semibold">Google 실제 청구 확인</p>
        <p className="mt-1 text-amber-800/90">
          Google AI Studio / Cloud Billing은 프로젝트 전체 사용량만 보여 주고,
          과목(수학·국어…)별로는 나누지 않습니다. 그래서 과목별 단가는 앱 로그로
          계산하고, 아래 링크에서 실제 청구액과 맞춰 보세요.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="https://aistudio.google.com/usage"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-950"
          >
            AI Studio 사용량 →
          </a>
          <a
            href="https://console.cloud.google.com/billing"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-950"
          >
            Cloud Billing →
          </a>
        </div>
      </div>
    </section>
  );
}
