import type {
  AvatarPrefTopItem,
  StudentAvatarPreferenceStats,
} from "@/lib/server/platform/avatar-prefs";

type Props = {
  stats: StudentAvatarPreferenceStats;
};

function RankList({
  title,
  items,
  empty,
}: {
  title: string;
  items: AvatarPrefTopItem[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg)]/40 p-3">
      <h3 className="mb-2 text-xs font-bold text-[var(--rm-text)]">{title}</h3>
      {items.length === 0 ? (
        <p className="text-[11px] text-[var(--rm-text-muted)]">{empty}</p>
      ) : (
        <ol className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                item.count > 0
                  ? "bg-[var(--rm-surface)]"
                  : "bg-[var(--rm-surface)]/50 opacity-55"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i < 3
                    ? "bg-[var(--rm-accent-soft,rgba(147,109,255,0.15))] text-[var(--rm-accent,#7c5cbf)]"
                    : "bg-[var(--rm-border)]/50 text-[var(--rm-text-muted)]"
                }`}
              >
                {i + 1}
              </span>
              {item.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageSrc}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white/80"
                />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded-lg bg-[var(--rm-border)]/40" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--rm-text)]">
                  {item.label}
                </p>
                <p className="text-[10px] text-[var(--rm-text-muted)]">
                  {item.count.toLocaleString("ko-KR")}명 · {item.pct}%
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Owner 전용 — 학생 아바타 선호 전체 순위 */
export function AvatarPreferencePanel({ stats }: Props) {
  return (
    <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">아이들이 선호하는 아바타</h2>
        <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
          아바타를 저장한 재원 학생 {stats.sampleSize.toLocaleString("ko-KR")}
          명 기준 · 품종 / 모자 / 안경 / 악세사리 전체 순위
          {stats.sampleSize === 0 ? " (아직 데이터가 없어요)" : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RankList
          title="품종"
          items={stats.animals}
          empty="저장된 품종이 없어요"
        />
        <RankList
          title="모자"
          items={stats.hats}
          empty="모자를 고른 학생이 없어요"
        />
        <RankList
          title="안경"
          items={stats.glasses}
          empty="안경을 고른 학생이 없어요"
        />
        <RankList
          title="악세사리"
          items={stats.accessories}
          empty="악세사리를 고른 학생이 없어요"
        />
      </div>
    </section>
  );
}
