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
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">
        {title}
      </h2>
      <div className="mt-4 flex h-40 items-end justify-between gap-1.5 sm:h-48 sm:gap-2">
        {data.map((day) => (
          <div
            key={day.date}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-[10px] font-medium tabular-nums text-zinc-600 sm:text-xs">
              {day.count > 0 ? day.count : ""}
            </span>
            <div
              className="w-full max-w-10 rounded-t-md bg-blue-500 transition-all"
              style={{
                height: `${Math.max(8, (day.count / max) * 100)}%`,
                opacity: day.count > 0 ? 1 : 0.25,
              }}
              title={`${day.label}: ${day.count}회`}
            />
            <span className="whitespace-nowrap text-[10px] text-zinc-400">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
