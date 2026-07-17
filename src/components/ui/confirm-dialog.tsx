"use client";

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
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-[var(--rm-danger)] text-white hover:opacity-90"
      : "bg-[var(--rm-brand)] text-white hover:opacity-90";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5 shadow-[var(--rm-shadow-soft)]">
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
