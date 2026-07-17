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

const inputClass =
  "w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2.5 text-sm text-[var(--rm-text)] outline-none focus:border-[var(--rm-border-glow)]";

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
          className="mb-1 block text-sm font-medium text-[var(--rm-text)]"
        >
          현재 비밀번호
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="nextPassword"
          className="mb-1 block text-sm font-medium text-[var(--rm-text)]"
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
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1 block text-sm font-medium text-[var(--rm-text)]"
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
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p className="rounded-xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-3 py-2 text-sm text-[var(--rm-text-on-error)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-[var(--rm-success-border)] bg-[var(--rm-success-bg)] px-3 py-2 text-sm text-[var(--rm-text-on-success)]">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--rm-brand)] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
