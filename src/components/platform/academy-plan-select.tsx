"use client";

import { useState, useTransition } from "react";
import { changeAcademyPlanAction } from "@/lib/actions/platform";
import type { PlanCode } from "@/lib/billing/plans";

export function AcademyPlanSelect({
  academyId,
  currentPlanCode,
  plans,
}: {
  academyId: string;
  currentPlanCode: string | null;
  plans: Array<{ code: string; name: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        disabled={pending}
        value={currentPlanCode ?? "basic"}
        onChange={(e) => {
          const next = e.target.value as PlanCode;
          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await changeAcademyPlanAction(academyId, next);
            if (result.error) setError(result.error);
            else setMessage(result.ok ?? "변경됨");
          });
        }}
        className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1 text-xs outline-none"
      >
        {plans.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-[11px] text-red-600">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-1 text-[11px] text-emerald-700">{message}</p>
      ) : null}
    </div>
  );
}
