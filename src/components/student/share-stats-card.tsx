"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { UserStats } from "@/lib/data/user-stats";
import { BRAND_SUBLINE } from "@/lib/constants/brand-copy";

type ShareSummary = UserStats["shareSummary"];

type Props = {
  summary: ShareSummary;
};

export function ShareStatsCard({ summary }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!cardRef.current || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `remind-${summary.weekLabel.replace(/\s/g, "")}.png`;
      link.href = dataUrl;
      link.click();

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], link.download, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Re:mind 학습 기록",
            });
            setMessage("공유했어요");
            return;
          } catch {
            // 사용자가 취소한 경우 — 다운로드만 됨
          }
        }
      }

      setMessage("이미지를 저장했어요");
    } catch {
      setMessage("저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 text-white md:p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold tracking-tight">
            Re<span className="text-blue-400">:</span>mind
          </p>
          <p className="text-xs font-medium text-[var(--rm-text-faint)]">{summary.weekLabel}</p>
        </div>

        <p className="mt-6 text-sm font-medium text-blue-200">이번 주 학습 기록</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <ShareStat value={summary.registeredThisWeek} label="등록" />
          <ShareStat value={summary.reviewedThisWeek} label="복습" />
          <ShareStat value={summary.archivedThisWeek} label="정복" />
        </div>

        {summary.topWeakness ? (
          <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-medium uppercase tracking-wider text-rose-300">
              TOP 약점
            </p>
            <p className="mt-1 text-lg font-bold">{summary.topWeakness}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
          <div>
            <p className="text-xs text-[var(--rm-text-faint)]">누적 등록</p>
            <p className="text-2xl font-bold">{summary.totalRegistered}</p>
          </div>
          {summary.studyStreak > 0 ? (
            <div className="text-right">
              <p className="text-xs text-[var(--rm-text-faint)]">연속 복습</p>
              <p className="text-2xl font-bold text-blue-300">
                {summary.studyStreak}
                <span className="ml-0.5 text-sm font-semibold">일</span>
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-[10px] text-[var(--rm-text-muted)]">
          {BRAND_SUBLINE}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--rm-brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 touch-manipulation"
      >
        {saving ? "저장 중…" : "이미지 저장 · 공유"}
      </button>

      {message ? (
        <p className="text-center text-xs text-[var(--rm-text-muted)]">{message}</p>
      ) : null}
    </div>
  );
}

function ShareStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-3 text-center backdrop-blur">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-300">{label}</p>
    </div>
  );
}
