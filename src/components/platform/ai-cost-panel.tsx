"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { AiCostSummary } from "@/lib/server/ai/cost";

type Props = {
  summary: AiCostSummary;
};

function formatWon(value: number): string {
  if (!Number.isFinite(value)) return "0원";
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  })}원`;
}

/** Owner 페이지 상단 — AI API 예상 지출 (토큰 기반 추정) */
export function AiCostPanel({ summary }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      start(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-950">
            AI API 예상 지출
          </h2>
          <p className="mt-0.5 text-xs text-amber-800/80">
            토큰 사용량으로 환산한 추정값입니다. 실제 Google/OpenAI 청구와
            ±20% 정도 차이가 날 수 있어요. 30초마다 자동 새로고침합니다.
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

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      {summary.byEngine.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {summary.byEngine.map((row) => (
            <li
              key={row.engine}
              className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-950"
            >
              <span className="font-medium">{row.engine}</span>
              <span>
                {row.calls}회 · {formatWon(row.krw)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-amber-800/70">
          아직 기록된 AI 호출이 없습니다. Supabase에{" "}
          <code className="rounded bg-white px-1">029_ai_cost_logs.sql</code>{" "}
          을 실행한 뒤, 학생이 AI로 문제를 읽으면 여기에 쌓입니다.
        </p>
      )}
    </section>
  );
}
