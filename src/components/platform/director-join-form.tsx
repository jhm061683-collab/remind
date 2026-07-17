"use client";

import { useActionState } from "react";
import {
  acceptInviteAction,
  type JoinActionState,
} from "@/lib/actions/platform";
import type { PublicInviteInfo } from "@/lib/server/platform/queries";
import { formatKrw, getPlanDefinition } from "@/lib/billing/pricing";

const initialState: JoinActionState = {};

export function DirectorJoinForm({ invite }: { invite: PublicInviteInfo }) {
  const [state, formAction, isPending] = useActionState(
    acceptInviteAction,
    initialState,
  );
  const plan = getPlanDefinition(invite.planCode);

  return (
    <form action={formAction} className="remind-card space-y-3 p-4 md:p-6">
      <input type="hidden" name="token" value={invite.token} />

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
        <p>
          학원 코드:{" "}
          <span className="font-mono font-semibold">{invite.academyCode}</span>
        </p>
        <p className="mt-1">
          요금제:{" "}
          <strong>{plan?.name ?? invite.planCode ?? "Basic"}</strong>
          {" · "}
          학생 1명당 <strong>{formatKrw(invite.pricePerStudentKrw)}</strong> /
          월
        </p>
        {plan ? (
          <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          예) 학생 20명이면 이번 달{" "}
          {formatKrw(20 * invite.pricePerStudentKrw)} · 학생 수가 바뀌면 월
          요금도 바뀝니다. 카드 등록은 결제할 때 합니다.
        </p>
        {invite.trialDays > 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            체험 {invite.trialDays}일
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="academyName"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          학원 이름
        </label>
        <input
          id="academyName"
          name="academyName"
          required
          defaultValue={invite.academyNameHint ?? ""}
          placeholder="학원 이름"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="displayName"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          원장 이름
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          placeholder="홍길동"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          로그인 아이디
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          placeholder="아이디"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={4}
          autoComplete="new-password"
          placeholder="4자 이상"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          휴대폰 (선택)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="01012345678"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "만드는 중…" : "학원 계정 만들기"}
      </button>
    </form>
  );
}
