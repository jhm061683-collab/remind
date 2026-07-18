"use client";

import { useState, useTransition } from "react";
import { resetDirectorPasswordAction } from "@/lib/actions/platform";

export function DirectorPasswordReset({
  academyId,
  directorUserId,
}: {
  academyId: string;
  directorUserId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!directorUserId) {
    return (
      <span className="text-[11px] text-[var(--rm-text-faint)]">원장 없음</span>
    );
  }

  function run() {
    setError(null);
    setCopied(false);
    if (
      !window.confirm(
        "원장 비밀번호를 임시 비번으로 재설정할까요? 기존 비번은 더 이상 쓸 수 없습니다.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await resetDirectorPasswordAction(
        academyId,
        directorUserId!,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setPassword(result.password ?? null);
    });
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="rounded-lg border border-[var(--rm-border)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--rm-surface-raised)] disabled:opacity-50"
      >
        {pending ? "재설정 중…" : "비번 재설정"}
      </button>
      {error ? (
        <p className="mt-1 text-[11px] text-red-600">{error}</p>
      ) : null}
      {password ? (
        <div className="mt-1 flex items-center gap-1.5">
          <code className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-900">
            {password}
          </code>
          <button
            type="button"
            onClick={copy}
            className="text-[11px] font-medium text-blue-600 hover:underline"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
