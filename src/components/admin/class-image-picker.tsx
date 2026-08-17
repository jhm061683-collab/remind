"use client";

import { useRef, useState, useTransition } from "react";
import { uploadClassImageAction } from "@/lib/actions/avatars";

type Props = {
  classId: string;
  initialUrl?: string | null;
};

export function ClassImagePicker({ classId, initialUrl = null }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadClassImageAction(formData);
      if (result.error || !result.url) {
        setMessage(result.error ?? "업로드 실패");
        return;
      }
      setUrl(result.url);
      setMessage("반 이미지를 저장했어요.");
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)]"
        aria-label="반 이미지 변경"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[var(--rm-text-muted)]">
            이미지
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[var(--rm-text)]">반 대표 이미지</p>
        <p className="text-[11px] text-[var(--rm-text-muted)]">
          선택 사항 · 명예의 전당에 표시됩니다
        </p>
        {message ? (
          <p className="mt-0.5 text-[11px] font-medium text-[var(--rm-nav-active)]">
            {message}
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
