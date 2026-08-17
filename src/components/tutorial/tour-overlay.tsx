"use client";

import { useEffect, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import type { PlacedTooltip, Rect } from "@/lib/tutorial/geometry";

type Props = {
  hole: Rect | null;
  radius: number;
  tooltip: PlacedTooltip | null;
  tipIndex: number;
  tipTotal: number;
  title: string;
  description: string;
  hideChecked: boolean;
  isFirst: boolean;
  isLast: boolean;
  allowInteraction: boolean;
  locating: boolean;
  tooltipRef: Ref<HTMLDivElement>;
  onHideCheckedChange: (value: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function TourOverlay({
  hole,
  radius,
  tooltip,
  tipIndex,
  tipTotal,
  title,
  description,
  hideChecked,
  isFirst,
  isLast,
  allowInteraction,
  locating,
  tooltipRef,
  onHideCheckedChange,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      data-tour-root="true"
      className="fixed inset-0 z-[200] h-[100dvh] w-screen overflow-hidden overscroll-none"
      style={{ touchAction: "none" }}
    >
      {hole ? (
        <DimWithHole
          hole={hole}
          radius={radius}
          allowInteraction={allowInteraction}
        />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-slate-950/60" />
      )}

      {hole ? (
        <div
          className="pointer-events-none absolute z-[2] border-2 border-amber-400"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: radius,
            boxShadow: "0 0 0 3px rgba(251, 191, 36, 0.28)",
          }}
        />
      ) : null}

      {tooltip && !locating ? (
        <div
          ref={tooltipRef}
          data-tour-dialog="true"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guided-tour-title"
          aria-describedby="guided-tour-desc"
          className="absolute z-[4] max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl"
          style={{
            top: tooltip.y,
            left: tooltip.x,
            width: tooltip.width,
            maxWidth: "calc(100vw - 24px)",
            touchAction: "pan-y",
            WebkitOverflowScrolling: "auto",
            overscrollBehavior: "contain",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
              TIP {tipIndex}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {tipIndex} / {tipTotal}
            </span>
          </div>
          <h2
            id="guided-tour-title"
            className="mt-2 text-base font-bold leading-snug text-slate-900"
          >
            {title}
          </h2>
          <p
            id="guided-tour-desc"
            className="mt-1 text-sm leading-relaxed text-slate-600"
          >
            {description}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={isFirst}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={onNext}
              className="min-h-[44px] flex-1 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white"
            >
              {isLast ? "완료" : "다음"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={hideChecked}
                onChange={(event) => onHideCheckedChange(event.target.checked)}
                className="h-5 w-5 accent-blue-600"
              />
              다시 보지 않기
            </label>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-slate-500"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function DimWithHole({
  hole,
  radius,
  allowInteraction,
}: {
  hole: Rect;
  radius: number;
  allowInteraction: boolean;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute bg-transparent"
          style={{
            top: hole.top,
            left: hole.left,
            width: Math.max(0, hole.width),
            height: Math.max(0, hole.height),
            borderRadius: radius,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
          }}
        />
      </div>
      {allowInteraction ? (
        <>
          <div
            className="pointer-events-auto absolute left-0 right-0 top-0"
            style={{ height: Math.max(0, hole.top) }}
          />
          <div
            className="pointer-events-auto absolute bottom-0 left-0 right-0"
            style={{ top: hole.top + hole.height }}
          />
          <div
            className="pointer-events-auto absolute left-0"
            style={{
              top: hole.top,
              height: hole.height,
              width: Math.max(0, hole.left),
            }}
          />
          <div
            className="pointer-events-auto absolute"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              height: hole.height,
              right: 0,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0 z-[1]" />
      )}
    </>
  );
}
