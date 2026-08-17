"use client";

import { useState } from "react";
import { useTutorial } from "@/components/tutorial/tutorial-provider";
import { isAutoHidden } from "@/lib/tutorial/preferences";

type Props = {
  compact?: boolean;
};

export function ReplayTutorials({ compact = false }: Props) {
  const { available, replay, prefs, role } = useTutorial();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  if (!role || available.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <h2 className="text-sm font-bold text-[var(--rm-text)]">
        튜토리얼 다시 보기
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--rm-text-muted)]">
        화면 위에서 어디를 눌러야 하는지 다시 알려 줍니다. 다시 봐도 「다시 보지
        않기」 설정은 바뀌지 않아요.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {available.map((tutorial) => {
          const hidden = isAutoHidden(tutorial, prefs);
          return (
            <button
              key={tutorial.key}
              type="button"
              onClick={() => {
                setPendingKey(tutorial.key);
                replay(tutorial.key);
              }}
              className="min-h-[48px] rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2.5 text-left touch-manipulation hover:border-[var(--rm-brand)]"
            >
              <span className="block text-sm font-semibold text-[var(--rm-text)]">
                {tutorial.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--rm-text-muted)]">
                {pendingKey === tutorial.key
                  ? "안내를 준비 중…"
                  : hidden
                    ? "자동 안내는 꺼져 있어요"
                    : "아직 자동 안내 대상"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
