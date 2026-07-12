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
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-zinc-900">{title}</h2>
      <div className="mt-6 flex h-48 items-end justify-between gap-2">
        {data.map((day) => (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-medium text-zinc-600">
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
            <span className="text-[10px] text-zinc-400">{day.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
