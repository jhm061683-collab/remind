"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCustomWrongReason,
  getCustomWrongReasons,
} from "@/lib/data/custom-wrong-reasons";
import { mergeWrongReasonOptions } from "@/lib/constants/wrong-reasons";
import { KeywordPicker } from "@/components/student/keyword-picker";
import {
  SOLVE_CONFIDENCE_OPTIONS,
  type SolveConfidence,
} from "@/lib/utils/solve-confidence";

type Props = {
  userId: string;
  wrongReason: string;
  wrongKeywords: string[];
  onWrongReasonChange: (value: string) => void;
  onWrongKeywordsChange: (value: string[]) => void;
  solveConfidence?: SolveConfidence | "";
  onSolveConfidenceChange?: (value: SolveConfidence | "") => void;
  selectClassName?: string;
  inputClassName?: string;
};

export function WrongReasonFields({
  userId,
  wrongReason,
  wrongKeywords,
  onWrongReasonChange,
  onWrongKeywordsChange,
  solveConfidence = "",
  onSolveConfidenceChange,
  inputClassName = "remind-input mt-1 text-base",
}: Props) {
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    void getCustomWrongReasons(userId).then(setCustom);
  }, [userId]);

  const options = useMemo(() => mergeWrongReasonOptions(custom), [custom]);

  async function handleAddCustom() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSavingCustom(true);
    try {
      const next = await addCustomWrongReason(userId, trimmed);
      setCustom(next);
      onWrongReasonChange(trimmed);
      setDraft("");
      setAdding(false);
    } finally {
      setSavingCustom(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="rm-field-hint">틀린 이유 (선택)</p>
        <div className="flex flex-wrap gap-2">
          {options.map((reason) => {
            const active = wrongReason === reason;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => onWrongReasonChange(active ? "" : reason)}
                className={`min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold touch-manipulation transition ${
                  active
                    ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_12%,white)] text-[var(--rm-brand)]"
                    : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
                }`}
              >
                {reason}
              </button>
            );
          })}
        </div>

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-[var(--rm-nav-active)] hover:underline"
          >
            + 나만의 틀린 이유 추가
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="예: 영어 빈칸추론 함정"
              className={`${inputClassName} mt-0 flex-1`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddCustom();
                }
              }}
            />
            <button
              type="button"
              disabled={savingCustom || !draft.trim()}
              onClick={() => void handleAddCustom()}
              className="rounded-xl bg-[var(--rm-brand)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-xs text-[var(--rm-text-muted)]"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {onSolveConfidenceChange ? (
        <div className="space-y-2">
          <p className="rm-field-hint">풀 때 느낌 (선택)</p>
          <div className="grid grid-cols-3 gap-2">
            {SOLVE_CONFIDENCE_OPTIONS.map((option) => {
              const active = solveConfidence === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onSolveConfidenceChange(active ? "" : option.value)
                  }
                  className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold touch-manipulation ${
                    active
                      ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_12%,white)] text-[var(--rm-brand)]"
                      : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
                  }`}
                >
                  <span className="text-base" aria-hidden>
                    {option.emoji}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <KeywordPicker
        userId={userId}
        kind="wrong"
        selected={wrongKeywords}
        onChange={onWrongKeywordsChange}
        label="오답 키워드"
        hint="입력하거나, 아래 목록에서 내가 만든 키워드를 골라 주세요."
        libraryTitle="내가 만든 오답 키워드"
        placeholder="예: 이차함수, 빈칸추론"
      />
    </div>
  );
}
