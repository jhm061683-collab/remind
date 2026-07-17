"use client";

import { useState, useTransition } from "react";
import { updateOwnStaffProfileAction } from "@/lib/actions/account";

type Props = {
  displayName: string;
  nickname: string | null;
  username: string | null;
  /** 관리자(admin)면 화면에 「OOO원장」으로 표시 */
  isAdmin: boolean;
};

export function StaffProfileForm({
  displayName,
  nickname,
  username,
  isAdmin,
}: Props) {
  const [name, setName] = useState(displayName);
  const [nick, setNick] = useState(nickname ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewBase = (nick.trim() || name.trim() || "이름").replace(
    /원장님?$/u,
    "",
  );
  const preview = isAdmin ? `${previewBase}원장` : previewBase;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900">표시 이름</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {isAdmin
          ? "학생·반 담당 목록에 보이는 원장 이름이에요."
          : "학생·반 담당 목록에 보이는 이름이에요."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            placeholder={isAdmin ? "예: 장현문" : "예: 김민수"}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            닉네임 (선택)
          </label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            placeholder="있으면 이 이름으로 표시"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        로그인 아이디: {username ?? "—"} · 화면에{" "}
        <strong className="text-zinc-800">{preview}</strong> 으로 보여요.
      </p>
      <button
        type="button"
        disabled={pending || name.trim().length < 2}
        className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const res = await updateOwnStaffProfileAction({
              displayName: name,
              nickname: nick,
            });
            setMessage(res.error ?? res.success ?? null);
          });
        }}
      >
        이름 저장
      </button>
      {message ? (
        <p className="mt-2 text-sm text-zinc-700">{message}</p>
      ) : null}
    </section>
  );
}
