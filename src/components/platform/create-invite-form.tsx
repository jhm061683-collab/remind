"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createInviteAction,
  type PlatformActionState,
} from "@/lib/actions/platform";

const initialState: PlatformActionState = {};

export function CreateInviteForm() {
  const [state, formAction, isPending] = useActionState(
    createInviteAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!state.inviteUrl || typeof window === "undefined") {
      setAbsoluteUrl(null);
      return;
    }
    setAbsoluteUrl(new URL(state.inviteUrl, window.location.origin).toString());
    setCopied(false);
  }, [state.inviteUrl]);

  async function copyLink() {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <p>{state.ok}</p>
          {absoluteUrl ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="block flex-1 break-all rounded-md bg-white/70 px-2 py-1.5 text-xs">
                {absoluteUrl}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            학원 코드 (미리 지정)
          </span>
          <input
            name="academyCode"
            required
            placeholder="예: GANGNAM01"
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            학원 이름 힌트 (선택)
          </span>
          <input
            name="academyNameHint"
            placeholder="예: 강남점"
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            학생 1명당 월 단가 (원)
          </span>
          <input
            name="pricePerStudentKrw"
            type="number"
            min={0}
            step={100}
            defaultValue={3000}
            required
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            체험 일수
          </span>
          <input
            name="trialDays"
            type="number"
            min={0}
            max={365}
            defaultValue={14}
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--rm-text)]">
            링크 유효 일수
          </span>
          <input
            name="expiresInDays"
            type="number"
            min={1}
            max={90}
            defaultValue={14}
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <p className="text-xs text-[var(--rm-text-muted)]">
        카드 정보는 받지 않습니다. 원장이 링크에서 정보만 입력하면 학원·원장
        계정이 만들어지고, 월 요금은{" "}
        <strong>학생 수 × 단가</strong>로 나중에 달라집니다.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "만드는 중…" : "초대 링크 만들기"}
      </button>
    </form>
  );
}
