"use client";

import { useState, useTransition } from "react";
import { updateOwnRecoveryEmailAction } from "@/lib/actions/account";

export function RecoveryEmailForm({
  initialEmail,
}: {
  initialEmail: string | null;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3.5 shadow-sm md:p-5">
      <h2 className="font-semibold text-[var(--rm-text)]">연락용 이메일</h2>
      <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
        비밀번호를 잊었을 때 본인 확인·안내용으로 씁니다. 로그인 아이디와는
        별개예요.
      </p>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium text-[var(--rm-text)]">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="hong@example.com"
          className="w-full rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          autoComplete="email"
        />
      </div>
      <button
        type="button"
        disabled={pending || email.trim().length < 3}
        className="mt-3 rounded-xl rm-fill-brand px-4 py-2 text-sm font-semibold disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const res = await updateOwnRecoveryEmailAction(email);
            setMessage(res.error ?? res.success ?? null);
          });
        }}
      >
        이메일 저장
      </button>
      {message ? (
        <p className="mt-2 text-sm text-[var(--rm-text)]">{message}</p>
      ) : null}
    </section>
  );
}
