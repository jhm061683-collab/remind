import Link from "next/link";

type Props = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: Props) {
  return (
    <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-8 text-center">
      <p className="font-semibold text-[var(--rm-text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--rm-text-muted)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--rm-brand)] px-4 text-sm font-semibold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function FilterEmptyState({
  summary,
  onReset,
}: {
  summary: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-8 text-center">
      <p className="font-semibold text-[var(--rm-text)]">조건에 맞는 결과가 없습니다</p>
      <p className="mt-1 text-sm text-[var(--rm-text-muted)]">{summary}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 min-h-[44px] rounded-xl border border-[var(--rm-border)] px-4 text-sm font-semibold text-[var(--rm-text)]"
      >
        필터 초기화
      </button>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] px-4 py-6 text-center">
      <p className="font-semibold text-[var(--rm-text-on-error)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-[44px] rounded-xl bg-[var(--rm-text)] px-4 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
