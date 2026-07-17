"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { DEMO_ACADEMY_CODE, PLATFORM_LOGIN_CODE } from "@/types/user";

const initialState: LoginState = {};

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
        <input
          id="academyCode"
          name="academyCode"
          type="text"
          autoComplete="organization"
          defaultValue={defaultAcademyCode?.trim() || DEMO_ACADEMY_CODE}
          placeholder={DEMO_ACADEMY_CODE}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          영문·숫자 4~12자 · 데모{" "}
          <span className="font-mono">{DEMO_ACADEMY_CODE}</span> · 플랫폼{" "}
          <span className="font-mono">{PLATFORM_LOGIN_CODE}</span>
        </p>
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
