"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import {
  useLocalStorageItem,
  writeLocalStorageItem,
} from "@/lib/react/client-display";
import { DEMO_ACADEMY_CODE } from "@/types/user";

const initialState: LoginState = {};
const ACADEMY_CODE_LOCK_KEY = "remind:locked-academy-code";
const USERNAME_REMEMBER_KEY = "remind:remembered-username";

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
  const serverAcademyCode = defaultAcademyCode?.trim() || DEMO_ACADEMY_CODE;
  const storedAcademyCode = useLocalStorageItem(ACADEMY_CODE_LOCK_KEY);
  const storedUsername = useLocalStorageItem(USERNAME_REMEMBER_KEY);
  const [academyDraft, setAcademyDraft] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const isAcademyCodeLocked = Boolean(storedAcademyCode);
  const rememberUsername = Boolean(storedUsername);
  const academyCode = academyDraft ?? storedAcademyCode ?? serverAcademyCode;
  const username = usernameDraft ?? defaultUsername ?? storedUsername ?? "";

  function toggleAcademyCodeLock() {
    if (isAcademyCodeLocked) {
      writeLocalStorageItem(ACADEMY_CODE_LOCK_KEY, null);
      setAcademyDraft(academyCode);
      return;
    }

    const normalizedCode = academyCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setAcademyDraft(normalizedCode);
    writeLocalStorageItem(ACADEMY_CODE_LOCK_KEY, normalizedCode);
  }

  function handleRememberUsernameChange(checked: boolean) {
    if (!checked) {
      writeLocalStorageItem(USERNAME_REMEMBER_KEY, null);
      setUsernameDraft(username);
      return;
    }
    const trimmed = username.trim();
    if (trimmed) {
      writeLocalStorageItem(USERNAME_REMEMBER_KEY, trimmed);
      setUsernameDraft(trimmed);
    }
  }

  return (
    <form
      action={(formData) => {
        const trimmedUsername = String(formData.get("username") ?? "").trim();
        if (rememberUsername && trimmedUsername) {
          writeLocalStorageItem(USERNAME_REMEMBER_KEY, trimmedUsername);
        } else if (!rememberUsername) {
          writeLocalStorageItem(USERNAME_REMEMBER_KEY, null);
        }
        formAction(formData);
      }}
      className="remind-card space-y-3 p-4 md:p-6"
      aria-busy={isPending}
    >
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="academyCode"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          학원 코드
        </label>
        <div className="flex gap-2">
          <input
            id="academyCode"
            name="academyCode"
            type="text"
            autoComplete="organization"
            value={academyCode}
            onChange={(event) => setAcademyDraft(event.target.value)}
            readOnly={isAcademyCodeLocked}
            disabled={isPending}
            placeholder="학원 코드를 입력하세요"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase outline-none transition read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-600 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            required
          />
          <button
            type="button"
            onClick={toggleAcademyCodeLock}
            disabled={isPending}
            aria-pressed={isAcademyCodeLocked}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              isAcademyCodeLocked
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {isAcademyCodeLocked ? "잠금 해제" : "기억"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          학원 코드만 기기에 기억합니다. 비밀번호는 저장하지 않아요.
        </p>
      </div>

      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          아이디
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsernameDraft(event.target.value)}
          disabled={isPending}
          placeholder="아이디를 입력하세요"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          required
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={rememberUsername}
            onChange={(event) =>
              handleRememberUsernameChange(event.target.checked)
            }
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300"
          />
          아이디 기억하기
        </label>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          비밀번호
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) =>
              setCapsLockOn(event.getModifierState?.("CapsLock") ?? false)
            }
            onKeyUp={(event) =>
              setCapsLockOn(event.getModifierState?.("CapsLock") ?? false)
            }
            disabled={isPending}
            placeholder="비밀번호를 입력하세요"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-20 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            aria-pressed={showPassword}
          >
            {showPassword ? "숨기기" : "보기"}
          </button>
        </div>
        {capsLockOn ? (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Caps Lock이 켜져 있어요
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 touch-manipulation active:scale-[0.99]"
      >
        {isPending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
