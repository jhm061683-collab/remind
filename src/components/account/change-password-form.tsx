"use client";

import { useActionState } from "react";
import {
  changeOwnPasswordAction,
  type ChangePasswordState,
} from "@/lib/actions/account";

const initial: ChangePasswordState = {};

type Props = {
  successHint?: string;
  revalidatePath?: string;
};

export function ChangePasswordForm({
  successHint,
  revalidatePath = "/account",
}: Props) {
  const [state, formAction, pending] = useActionState(
    changeOwnPasswordAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-3">
      {successHint ? (
        <input type="hidden" name="successHint" value={successHint} />
      ) : null}
      <input type="hidden" name="revalidatePath" value={revalidatePath} />

      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          현재 비밀번호
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="nextPassword"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          새 비밀번호
        </label>
        <input
          id="nextPassword"
          name="nextPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          새 비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>

      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
