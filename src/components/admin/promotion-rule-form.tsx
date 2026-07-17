"use client";

import { useState, useTransition } from "react";
import { savePromotionRuleAction } from "@/lib/actions/admin";

type Props = {
  initialMonth?: number;
  initialDay?: number;
};

export function PromotionRuleForm({ initialMonth = 1, initialDay = 1 }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
      <h3 className="font-semibold text-[var(--rm-text)]">자동 진급 기준일</h3>
      <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
        매년 지정일에 학년을 자동으로 1단계 올립니다. (고3 다음은 성인)
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-20 rounded-lg border border-[var(--rm-border)] px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-[var(--rm-text-muted)]">월</span>
        <input
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-20 rounded-lg border border-[var(--rm-border)] px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-[var(--rm-text-muted)]">일</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await savePromotionRuleAction(month, day);
              setMessage(res.error ?? res.success ?? null);
            })
          }
          className="rounded-xl bg-[var(--rm-text)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          저장
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-[var(--rm-text-muted)]">{message}</p> : null}
    </section>
  );
}
