"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useState, useTransition } from "react";
import {
  chargeThisMonthAction,
  registerMockCardAction,
} from "@/lib/actions/billing";
import { formatKrw } from "@/lib/billing/pricing";
import type { AcademyBillingSummary } from "@/lib/server/billing/queries";

type ChargeRow = {
  id: string;
  order_id: string;
  amount_krw: number;
  student_count: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  failure_message: string | null;
};

export function BillingPanel({
  summary,
  clientKey,
  customerName,
  customerEmail,
  successUrl,
  failUrl,
  charges,
  configured,
  mockMode,
}: {
  summary: AcademyBillingSummary;
  clientKey: string | null;
  customerName: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
  charges: ChargeRow[];
  configured: boolean;
  mockMode: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function registerCard() {
    setError(null);
    setMessage(null);

    if (mockMode) {
      startTransition(async () => {
        const result = await registerMockCardAction();
        if (result.error) setError(result.error);
        if (result.ok) setMessage(result.ok);
      });
      return;
    }

    if (!configured || !clientKey) {
      setError(
        "토스 키가 없습니다. 사업자번호가 없으면 목 결제(기본)로 테스트하세요.",
      );
      return;
    }

    setBusy(true);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({
        customerKey: summary.customerKey,
      });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl,
        failUrl,
        customerName,
        customerEmail,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "카드 등록 창을 열지 못했습니다.",
      );
      setBusy(false);
    }
  }

  function chargeNow() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await chargeThisMonthAction();
      if (result.error) setError(result.error);
      if (result.ok) setMessage(result.ok);
    });
  }

  const canRegister = mockMode || configured;

  return (
    <div className="space-y-6">
      {mockMode ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          지금은 <strong>목(mock) 결제</strong> 모드입니다. 실제 돈은 나가지
          않습니다. 사업자번호·토스 계약이 생기면 키만 넣으면 실결제로
          바뀝니다.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="text-sm font-semibold">이번 달 예상 요금</h2>
        <p className="mt-2 text-2xl font-bold tracking-tight">
          {formatKrw(summary.estimatedMonthlyKrw)}
        </p>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          {summary.planName ? `${summary.planName} · ` : null}
          학생 {summary.studentCount}명 × {formatKrw(summary.pricePerStudentKrw)}
          {summary.aiMonthlyLimit > 0
            ? ` · AI 월 ${summary.aiMonthlyLimit}건 (하루 ${summary.ocrDailyLimit}건)`
            : " · AI 분석 없음"}
          {summary.aiGoldMonthlyLimit > 0
            ? ` · GPT-4o 골드 ${summary.aiGoldMonthlyLimit}건`
            : null}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-text-faint)]">
          학생 수가 바뀌면 월 요금도 바뀝니다. 카드 번호는 우리 서버에 저장하지
          않습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="mb-2 text-sm font-semibold">결제 수단</h2>
        {summary.hasBillingKey ? (
          <div className="space-y-3">
            <p className="text-sm">
              등록됨: {summary.cardCompany ?? "카드"}{" "}
              <span className="font-mono text-xs">
                {summary.cardNumberMasked ?? ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || pending || !canRegister}
                onClick={registerCard}
                className="rounded-xl border border-[var(--rm-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--rm-surface-raised)] disabled:opacity-60"
              >
                {busy || pending
                  ? "처리 중…"
                  : mockMode
                    ? "목 카드 다시 등록"
                    : "카드 다시 등록"}
              </button>
              <button
                type="button"
                disabled={pending || summary.estimatedMonthlyKrw <= 0}
                onClick={chargeNow}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending
                  ? "결제 중…"
                  : mockMode
                    ? "이번 달 결제(목)"
                    : "이번 달 결제하기"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--rm-text-muted)]">
              {mockMode
                ? "사업자번호 전에도 목 카드로 흐름을 시험할 수 있습니다."
                : "아직 카드가 없습니다. 결제할 때 토스 창에서 등록합니다."}
            </p>
            <button
              type="button"
              disabled={busy || pending || !canRegister}
              onClick={registerCard}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy || pending
                ? "처리 중…"
                : mockMode
                  ? "목 카드 등록하기"
                  : "카드 등록하기"}
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">최근 결제</h2>
        {charges.length === 0 ? (
          <p className="text-sm text-[var(--rm-text-muted)]">
            아직 결제 내역이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--rm-border)] text-xs text-[var(--rm-text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">일시</th>
                  <th className="px-4 py-3 font-medium">금액</th>
                  <th className="px-4 py-3 font-medium">학생</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--rm-border)] last:border-0"
                  >
                    <td className="px-4 py-3 text-xs">
                      {new Date(row.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {formatKrw(Number(row.amount_krw))}
                    </td>
                    <td className="px-4 py-3">{row.student_count}명</td>
                    <td className="px-4 py-3 text-xs">
                      {row.status}
                      {row.failure_message ? (
                        <span className="block text-red-600">
                          {row.failure_message}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
