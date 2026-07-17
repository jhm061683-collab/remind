type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function AdminStatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-3 shadow-sm sm:px-4 sm:py-3.5">
      <p className="truncate text-xs text-zinc-500 sm:text-sm">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900 sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}
