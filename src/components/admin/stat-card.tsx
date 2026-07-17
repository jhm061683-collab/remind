type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function AdminStatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 shadow-[var(--rm-shadow-soft)] sm:px-3.5 sm:py-3">
      <p className="truncate text-[10px] font-semibold tracking-wide text-[var(--rm-text-muted)] sm:text-[11px]">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tracking-tight tabular-nums text-[var(--rm-text)] sm:text-xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-[var(--rm-text-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
