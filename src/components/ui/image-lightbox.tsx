"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";

type Props = {
  urls: string[];
  initialIndex?: number;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

export function ImageLightbox({
  urls,
  initialIndex = 0,
  alt = "사진",
  open,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, urls.length - 1)));
  }, [open, initialIndex, urls.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, urls.length, onClose]);

  function go(delta: number) {
    if (urls.length < 2) return;
    setIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return urls.length - 1;
      if (next >= urls.length) return 0;
      return next;
    });
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null || urls.length < 2) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  }

  if (!open || !mounted || urls.length === 0) return null;

  const current = urls[Math.min(index, urls.length - 1)]!;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="사진 확대 보기"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 text-white">
        <p className="text-sm font-medium">
          {urls.length > 1 ? `${index + 1} / ${urls.length}` : "사진 보기"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm"
        >
          닫기
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={urls.length > 1 ? `${alt} ${index + 1}` : alt}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />

        {urls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="이전 사진"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음 사진"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <p className="pb-4 text-center text-xs text-white/60">
        배경을 탭하면 닫혀요
      </p>
    </div>,
    document.body,
  );
}
