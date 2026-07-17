"use client";

import { useActionState } from "react";
import {
  createAcademyAction,
  type PlatformActionState,
} from "@/lib/actions/platform";

const initialState: PlatformActionState = {};

type PlanOption = {
  code: string;
  name: string;
};

export function CreateAcademyForm({ plans }: { plans: PlanOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createAcademyAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.ok}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            학원 이름
          </span>
          <input
            name="name"
            required
            placeholder="예: 강남점"
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            학원 코드
          </span>
          <input
            name="code"
            required
            placeholder="예: GANGNAM"
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            시작 플랜
          </span>
          <select
            name="planCode"
            defaultValue="trial"
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            {plans.map((plan) => (
              <option key={plan.code} value={plan.code}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "만드는 중…" : "학원 추가"}
      </button>
    </form>
  );
}
