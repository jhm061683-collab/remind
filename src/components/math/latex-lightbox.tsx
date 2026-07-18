"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LatexContent } from "@/components/math/latex-content";

type Props = {
  content: string;
  open: boolean;
  onClose: () => void;
  title?: string;
};

/** AI가 조판한 문제를 전체 화면으로 크게 보여주는 뷰어 */
export function LatexLightbox({
  content,
  open,
  onClose,
  title = "문제 크게 보기",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 text-white">
        <p className="text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm"
        >
          닫기
        </button>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-6">
        <div
          className="mx-auto h-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--rm-surface)] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <LatexContent
            content={content}
            className="px-5 py-6 text-lg leading-9"
          />
        </div>
      </div>

      <p className="pb-4 text-center text-xs text-white/60">
        배경을 탭하면 닫혀요
      </p>
    </div>,
    document.body,
  );
}
