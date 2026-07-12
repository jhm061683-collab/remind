"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  addKeywordToLibrary,
  deleteKeywordFromLibrary,
  getKeywordLibrary,
  toggleKeywordFavorite,
} from "@/lib/data/keyword-library";
import {
  normalizeKeywordLabel,
  sortKeywordEntries,
  type KeywordEntry,
  type KeywordKind,
} from "@/lib/keywords/library";

type Props = {
  userId: string;
  kind: KeywordKind;
  selected: string[];
  onChange: (next: string[]) => void;
  label: string;
  hint?: string;
  placeholder?: string;
};

export function KeywordPicker({
  userId,
  kind,
  selected,
  onChange,
  label,
  hint,
  placeholder = "키워드 입력 후 Enter",
}: Props) {
  const [entries, setEntries] = useState<KeywordEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getKeywordLibrary(userId).then((lib) => setEntries(lib[kind]));
  }, [userId, kind]);

  const sorted = useMemo(() => sortKeywordEntries(entries), [entries]);
  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected],
  );

  function toggleSelect(labelText: string) {
    const normalized = normalizeKeywordLabel(labelText);
    if (!normalized) return;
    if (selectedSet.has(normalized.toLowerCase())) {
      onChange(selected.filter((s) => s.toLowerCase() !== normalized.toLowerCase()));
      return;
    }
    onChange([...selected, normalized]);
  }

  async function handleAdd() {
    const normalized = normalizeKeywordLabel(draft);
    if (!normalized) return;
    setBusy(true);
    try {
      const lib = await addKeywordToLibrary(userId, kind, normalized);
      setEntries(lib[kind]);
      if (!selectedSet.has(normalized.toLowerCase())) {
        onChange([...selected, normalized]);
      }
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function handleFavorite(labelText: string, e: MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      const lib = await toggleKeywordFavorite(userId, kind, labelText);
      setEntries(lib[kind]);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(labelText: string, e: MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`「${labelText}」키워드를 목록에서 삭제할까요?`)) return;
    setBusy(true);
    try {
      const lib = await deleteKeywordFromLibrary(userId, kind, labelText);
      setEntries(lib[kind]);
      onChange(
        selected.filter((s) => s.toLowerCase() !== labelText.toLowerCase()),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="remind-input flex-1 text-base"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => void handleAdd()}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {sorted.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((entry) => {
            const active = selectedSet.has(entry.label.toLowerCase());
            return (
              <div
                key={entry.label}
                className={`inline-flex max-w-full items-center gap-0.5 rounded-full border pl-2.5 pr-1 py-1 text-xs transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : entry.favorite
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelect(entry.label)}
                  className="max-w-[9rem] truncate font-semibold"
                  title={
                    entry.favorite
                      ? `즐겨찾기 · 사용 ${entry.useCount}회`
                      : `사용 ${entry.useCount}회`
                  }
                >
                  {entry.favorite ? "★ " : ""}
                  {entry.label}
                </button>
                <button
                  type="button"
                  aria-label="즐겨찾기"
                  disabled={busy}
                  onClick={(e) => void handleFavorite(entry.label, e)}
                  className={`rounded-full px-1.5 py-0.5 ${
                    entry.favorite ? "text-amber-500" : "text-slate-400"
                  }`}
                >
                  {entry.favorite ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  aria-label="삭제"
                  disabled={busy}
                  onClick={(e) => void handleDelete(entry.label, e)}
                  className="rounded-full px-1.5 py-0.5 text-slate-400 hover:text-rose-600"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          아직 저장된 키워드가 없어요. 위에서 추가해 보세요.
        </p>
      )}

      {selected.length > 0 ? (
        <p className="text-[11px] text-slate-500">
          선택됨: {selected.map((s) => `#${s}`).join(" ")}
        </p>
      ) : null}
    </div>
  );
}
