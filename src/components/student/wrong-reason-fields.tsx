"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCustomWrongReason,
  getCustomWrongReasons,
} from "@/lib/data/custom-wrong-reasons";
import { mergeWrongReasonOptions } from "@/lib/constants/wrong-reasons";
import { KeywordPicker } from "@/components/student/keyword-picker";

type Props = {
  userId: string;
  wrongReason: string;
  wrongKeywords: string[];
  onWrongReasonChange: (value: string) => void;
  onWrongKeywordsChange: (value: string[]) => void;
  selectClassName?: string;
  inputClassName?: string;
};

export function WrongReasonFields({
  userId,
  wrongReason,
  wrongKeywords,
  onWrongReasonChange,
  onWrongKeywordsChange,
  selectClassName = "remind-input mt-1 text-base",
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
        <label className="block">
          <span className="rm-field-hint">틀린 이유 (선택)</span>
          <select
            value={wrongReason}
            onChange={(e) => onWrongReasonChange(e.target.value)}
            className={selectClassName}
          >
            <option value="">선택 안 함</option>
            {options.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>

        {custom.length > 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold text-slate-500">
              내가 만든 틀린 이유 · 탭해서 선택
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {custom.map((reason) => {
                const active = wrongReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      onWrongReasonChange(active ? "" : reason)
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-blue-600 hover:underline"
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
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600"
            >
              취소
            </button>
          </div>
        )}
      </div>

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
