type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function AdminStatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4 sm:py-3.5">
      <p className="truncate text-[11px] font-medium tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
