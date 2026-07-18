"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  IconArchive,
  IconHome,
  IconPlusPhoto,
  IconStudy,
} from "@/components/ui/icons";
import { UI_LABELS } from "@/lib/constants/ui-labels";

const ONBOARDING_VERSION = "v1";
export const OPEN_ONBOARDING_EVENT = "remind:open-onboarding";

type Step = {
  Icon: ComponentType<{ className?: string; size?: number }>;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    Icon: IconHome,
    title: "Re:mind에 오신 걸 환영해요",
    body: "틀린 문제를 사진으로 모아 두고, 잊을 때쯤 다시 풀어서 내 것으로 만드는 앱이에요. 3단계만 기억하면 됩니다.",
  },
  {
    Icon: IconPlusPhoto,
    title: `① ${UI_LABELS.registerTab} — 틀린 문제 올리기`,
    body: "아래 「등록」에서 문제 사진을 찍어 올리고, 과목만 골라 저장해요. 긴 문제는 페이지를 2장까지 넣을 수 있어요.",
  },
  {
    Icon: IconStudy,
    title: `② ${UI_LABELS.studyTab} — 복습하기`,
    body: "「다시 풀기」에 오늘 볼 문제가 자동으로 떠요. 맞혔는지 틀렸는지만 눌러 주면 다음 복습 날짜가 알아서 정해집니다.",
  },
  {
    Icon: IconArchive,
    title: "③ 보관 — 정복한 문제 모으기",
    body: "충분히 익힌 문제는 「보관」으로 넘어가요. 지금까지 정복한 문제가 쌓이는 걸 보면 뿌듯해요.",
  },
  {
    Icon: IconHome,
    title: "홈에서 한눈에",
    body: "홈에서 오늘 할 복습, 연속 학습, 이번 주 기록을 볼 수 있어요. 이제 시작해 볼까요?",
  },
];

function storageKey(userId: string): string {
  return `remind:onboarding:student:${ONBOARDING_VERSION}:${userId}`;
}

export function StudentOnboarding({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (userId === "guest") return;
    try {
      const seen = window.localStorage.getItem(storageKey(userId));
      if (!seen) {
        setStep(0);
        setOpen(true);
      }
    } catch {
      // localStorage 막힘 → 조용히 무시
    }
  }, [userId]);

  useEffect(() => {
    function onOpen() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_ONBOARDING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, onOpen);
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey(userId), String(Date.now()));
    } catch {
      // 무시
    }
  }, [userId]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.Icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--rm-text-muted)]">
            {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs font-medium text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
          >
            건너뛰기
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl rm-fill-brand">
            <Icon size={32} />
          </div>
          <h2
            id="onboarding-title"
            className="mt-4 text-lg font-bold text-[var(--rm-text)]"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--rm-text-muted)]">
            {current.body}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-5 bg-blue-600"
                  : "w-1.5 bg-[var(--rm-border)]"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex-1 rounded-xl border border-[var(--rm-border)] py-3 text-sm font-semibold text-[var(--rm-text)]"
            >
              이전
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            {isLast ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
