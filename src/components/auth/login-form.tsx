"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { DEMO_ACADEMY_CODE } from "@/types/user";

const initialState: LoginState = {};
const ACADEMY_CODE_LOCK_KEY = "remind:locked-academy-code";

export function LoginForm({
  defaultAcademyCode,
  defaultUsername,
}: {
  defaultAcademyCode?: string;
  defaultUsername?: string;
} = {}) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );
  const [academyCode, setAcademyCode] = useState(
    defaultAcademyCode?.trim() || DEMO_ACADEMY_CODE,
  );
  const [isAcademyCodeLocked, setIsAcademyCodeLocked] = useState(false);

  useEffect(() => {
    const lockedCode = window.localStorage.getItem(ACADEMY_CODE_LOCK_KEY);
    if (lockedCode) {
      setAcademyCode(lockedCode);
      setIsAcademyCodeLocked(true);
    }
  }, []);

  function toggleAcademyCodeLock() {
    if (isAcademyCodeLocked) {
      window.localStorage.removeItem(ACADEMY_CODE_LOCK_KEY);
      setIsAcademyCodeLocked(false);
      return;
    }

    const normalizedCode = academyCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setAcademyCode(normalizedCode);
    window.localStorage.setItem(ACADEMY_CODE_LOCK_KEY, normalizedCode);
    setIsAcademyCodeLocked(true);
  }

  return (
    <form
      action={formAction}
      className="remind-card space-y-3 p-4 md:p-6"
    >
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="academyCode" className="mb-1 block text-sm font-medium text-slate-700">
          학원 코드
        </label>
        <div className="flex gap-2">
          <input
            id="academyCode"
            name="academyCode"
            type="text"
            autoComplete="organization"
            value={academyCode}
            onChange={(event) => setAcademyCode(event.target.value)}
            readOnly={isAcademyCodeLocked}
            placeholder="학원 코드를 입력하세요"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase outline-none transition read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-600 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            required
          />
          <button
            type="button"
            onClick={toggleAcademyCodeLock}
            aria-pressed={isAcademyCodeLocked}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              isAcademyCodeLocked
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {isAcademyCodeLocked ? "잠금 해제" : "잠금"}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
          아이디
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={defaultUsername ?? ""}
          placeholder="아이디를 입력하세요"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
