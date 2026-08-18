"use client";

import { useEffect } from "react";
import { useClientMounted } from "@/lib/react/client-display";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 하단 네비 위에 잘리지 않도록 화면 중앙 확인창 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const mounted = useClientMounted();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-[var(--rm-danger)] text-white hover:opacity-90"
      : "bg-[var(--rm-brand)] text-white hover:opacity-90";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      style={{
        paddingBottom: "max(1.5rem, calc(5.5rem + env(safe-area-inset-bottom)))",
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-bold text-[var(--rm-text)]"
        >
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--rm-text-muted)]">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[48px] rounded-xl border border-[var(--rm-border)] py-3 text-sm font-semibold text-[var(--rm-text)] touch-manipulation disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[48px] rounded-xl py-3 text-sm font-bold touch-manipulation disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
