"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCustomWrongReason,
  getCustomWrongReasons,
} from "@/lib/data/custom-wrong-reasons";
import { mergeWrongReasonOptions } from "@/lib/constants/wrong-reasons";

type Props = {
  userId: string;
  wrongReason: string;
  wrongReasonDetail: string;
  onWrongReasonChange: (value: string) => void;
  onWrongReasonDetailChange: (value: string) => void;
  selectClassName?: string;
  inputClassName?: string;
};

export function WrongReasonFields({
  userId,
  wrongReason,
  wrongReasonDetail,
  onWrongReasonChange,
  onWrongReasonDetailChange,
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
    <div className="space-y-3">
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

      {wrongReason ? (
        <label className="block">
          <span className="rm-field-hint">세부 내용 · 검색 키워드 (선택)</span>
          <input
            type="text"
            value={wrongReasonDetail}
            onChange={(e) => onWrongReasonDetailChange(e.target.value)}
            placeholder="예: 이차함수 꼭짓점, 빈칸 앞뒤 연결, 조선 후기 신분제"
            className={inputClassName}
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            여기에 적은 내용은 보관함 검색에 포함됩니다.
          </span>
        </label>
      ) : null}
    </div>
  );
}
