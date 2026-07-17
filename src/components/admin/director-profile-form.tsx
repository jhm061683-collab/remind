"use client";

import { useState, useTransition } from "react";
import { updateDirectorProfileAction } from "@/lib/actions/admin";

type Props = {
  displayName: string;
  nickname: string | null;
  username: string | null;
};

export function DirectorProfileForm({
  displayName,
  nickname,
  username,
}: Props) {
  const [name, setName] = useState(displayName);
  const [nick, setNick] = useState(nickname ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewBase = (nick.trim() || name.trim() || "이름").replace(
    /원장님?$/u,
    "",
  );

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <h2 className="font-semibold text-violet-950">원장(관리자) 표시 이름</h2>
      <p className="mt-1 text-xs text-violet-900/80">
        「원장으로 지정」은 <strong>새 선생님 계정에 관리자 권한을 여는 것</strong>
        이고, 지금 로그인 중인 원장 계정 이름과는 별개예요. 학생/반에 「박원장」으로
        보이면 여기서 <strong>장현문</strong>으로 바꿔 주세요.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-violet-950">
            이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm"
            placeholder="예: 장현문"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-violet-950">
            닉네임 (선택)
          </label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm"
            placeholder="있으면 이 이름으로 표시"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-violet-800">
        로그인 아이디: {username ?? "—"} · 화면에{" "}
        <strong>{previewBase}원장</strong> 으로 보여요.
      </p>
      <button
        type="button"
        disabled={pending || name.trim().length < 2}
        className="mt-3 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const res = await updateDirectorProfileAction({
              displayName: name,
              nickname: nick,
            });
            setMessage(res.error ?? res.success ?? null);
          });
        }}
      >
        원장 이름 저장
      </button>
      {message ? (
        <p className="mt-2 text-sm text-violet-950">{message}</p>
      ) : null}
    </section>
  );
}
