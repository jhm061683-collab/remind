import type { DailyActivity } from "@/lib/types/admin";

type Props = {
  data: DailyActivity[];
  title?: string;
};

export function WeeklyActivityChart({
  data,
  title = "최근 7일 복습 횟수",
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <section className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 shadow-[var(--rm-shadow-soft)] sm:p-3.5">
      <h2 className="text-sm font-semibold text-[var(--rm-text)]">{title}</h2>
      <div className="mt-3 flex h-32 items-end justify-between gap-1.5 sm:h-36 sm:gap-2">
        {data.map((day) => (
          <div
            key={day.date}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className="text-[10px] font-medium tabular-nums text-[var(--rm-text-muted)]">
              {day.count > 0 ? day.count : ""}
            </span>
            <div
              className="w-full max-w-9 rounded-t-md transition-all"
              style={{
                height: `${Math.max(8, (day.count / max) * 100)}%`,
                opacity: day.count > 0 ? 1 : 0.25,
                background:
                  "linear-gradient(180deg, var(--rm-brand-violet) 0%, var(--rm-brand) 100%)",
              }}
              title={`${day.label}: ${day.count}회`}
            />
            <span className="whitespace-nowrap text-[10px] text-[var(--rm-text-faint)]">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
