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
  /** 저장된 키워드 목록 제목 */
  libraryTitle?: string;
  placeholder?: string;
};

export function KeywordPicker({
  userId,
  kind,
  selected,
  onChange,
  label,
  hint,
  libraryTitle,
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

  const listTitle =
    libraryTitle ??
    (kind === "wrong" ? "내가 만든 오답 키워드" : "내가 만든 문제 키워드");

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
        <p className="text-sm font-medium text-[var(--rm-text)]">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-[var(--rm-text-muted)]">{hint}</p> : null}
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
          className="rounded-xl bg-[var(--rm-text)] px-3 py-2 text-xs font-bold text-[var(--rm-surface)] disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {sorted.length > 0 ? (
        <div className="rounded-xl border border-[var(--rm-border)] bg-[color-mix(in_srgb,var(--rm-surface-raised)_80%,transparent)] p-3">
          <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
            {listTitle} · 탭해서 선택
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sorted.map((entry) => {
              const active = selectedSet.has(entry.label.toLowerCase());
              return (
                <div
                  key={entry.label}
                  className={`inline-flex max-w-full items-center gap-0.5 rounded-full border pl-2.5 pr-1 py-1 text-xs transition ${
                    active
                      ? "border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] text-[var(--rm-text-on-info)]"
                      : entry.favorite
                        ? "border-[color-mix(in_srgb,var(--rm-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] text-[var(--rm-text)]"
                        : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
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
                      entry.favorite ? "text-amber-500" : "text-[var(--rm-text-faint)]"
                    }`}
                  >
                    {entry.favorite ? "★" : "☆"}
                  </button>
                  <button
                    type="button"
                    aria-label="삭제"
                    disabled={busy}
                    onClick={(e) => void handleDelete(entry.label, e)}
                    className="rounded-full px-1.5 py-0.5 text-[var(--rm-text-faint)] hover:text-[var(--rm-danger)]"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2 text-[11px] text-[var(--rm-text-faint)]">
          아직 만든 {kind === "wrong" ? "오답" : "문제"} 키워드가 없어요. 위에서
          추가하면 다음에 여기 목록으로 나와요.
        </p>
      )}

      {selected.length > 0 ? (
        <p className="text-[11px] text-[var(--rm-text-muted)]">
          선택됨: {selected.map((s) => `#${s}`).join(" ")}
        </p>
      ) : null}
    </div>
  );
}
