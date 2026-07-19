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

/**
 * AI가 조판한 문제를 전체 화면으로 크게 보여주는 뷰어.
 * body로 포털되어 테마 CSS 변수가 안 닿으므로 색은 리터럴로만 쓴다.
 */
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
      className="fixed inset-0 z-[100] flex flex-col bg-black/85"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <p className="text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold text-white"
        >
          닫기 ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 px-3">
        <div
          className="mx-auto h-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <LatexContent
            content={content}
            className="px-5 py-6 text-lg leading-9 !text-slate-900"
          />
        </div>
      </div>

      <div
        className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] w-full rounded-2xl bg-white text-base font-bold text-slate-900 touch-manipulation"
        >
          작게 보기 (닫기)
        </button>
      </div>
    </div>,
    document.body,
  );
}
