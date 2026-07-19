"use client";

import { LatexContent } from "@/components/math/latex-content";

export type ProblemDraft = {
  id: string;
  selected: boolean;
  number: string;
  /** 문항만 (공통 지문 제외) */
  bodyLatex: string;
  answerText: string;
  keywords: string[];
  editing: boolean;
};

type Props = {
  sharedPassage: string;
  drafts: ProblemDraft[];
  onChange: (next: ProblemDraft[]) => void;
  onSharedPassageChange: (value: string) => void;
};

export function ProblemDraftList({
  sharedPassage,
  drafts,
  onChange,
  onSharedPassageChange,
}: Props) {
  const selectedCount = drafts.filter((d) => d.selected).length;

  function patch(id: string, patch: Partial<ProblemDraft>) {
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  if (drafts.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--rm-text)]">
          AI가 나눈 문항 ({selectedCount}/{drafts.length}개 선택)
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChange(drafts.map((d) => ({ ...d, selected: true })))
            }
            className="rounded-lg border border-[var(--rm-border)] px-2 py-1 text-[11px] font-semibold text-[var(--rm-text-muted)]"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={() =>
              onChange(drafts.map((d) => ({ ...d, selected: false })))
            }
            className="rounded-lg border border-[var(--rm-border)] px-2 py-1 text-[11px] font-semibold text-[var(--rm-text-muted)]"
          >
            전체 해제
          </button>
        </div>
      </div>

      {sharedPassage ? (
        <div className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)]">
          <p className="border-b border-[var(--rm-border)] px-3 py-2 text-[11px] font-bold text-[var(--rm-text-muted)]">
            공통 지문 (선택한 문항에 함께 저장돼요)
          </p>
          <textarea
            rows={5}
            value={sharedPassage}
            onChange={(e) => onSharedPassageChange(e.target.value)}
            className="remind-input w-full rounded-none border-0 font-serif text-sm leading-6"
            placeholder="공통 지문"
          />
        </div>
      ) : null}

      {drafts.map((draft, index) => (
        <div
          key={draft.id}
          className={`overflow-hidden rounded-xl border ${
            draft.selected
              ? "border-[var(--rm-nav-active)] bg-[var(--rm-surface)]"
              : "border-[var(--rm-border)] bg-[var(--rm-surface)] opacity-60"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-[var(--rm-text)]">
              <input
                type="checkbox"
                checked={draft.selected}
                onChange={(e) => patch(draft.id, { selected: e.target.checked })}
                className="h-4 w-4 accent-[var(--rm-nav-active)]"
              />
              <span className="truncate">
                {draft.number
                  ? `${draft.number}번`
                  : `문항 ${index + 1}`}
              </span>
            </label>
            <button
              type="button"
              onClick={() => patch(draft.id, { editing: !draft.editing })}
              className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-nav-active)]"
            >
              {draft.editing ? "미리보기" : "수정"}
            </button>
          </div>

          {draft.editing ? (
            <div className="space-y-2 p-3">
              <input
                value={draft.number}
                onChange={(e) => patch(draft.id, { number: e.target.value })}
                placeholder="문항 번호 (예: 28)"
                className="remind-input w-full text-sm"
              />
              <textarea
                rows={7}
                value={draft.bodyLatex}
                onChange={(e) =>
                  patch(draft.id, { bodyLatex: e.target.value })
                }
                className="remind-input w-full font-mono text-sm leading-6"
                placeholder="문항 본문 (수식은 $...$)"
              />
            </div>
          ) : (
            <LatexContent
              content={draft.bodyLatex}
              className="max-h-56 overflow-auto px-4 py-3 text-[15px]"
            />
          )}

          <div className="border-t border-[var(--rm-border)] px-3 py-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                정답 {draft.selected ? "*" : ""}
              </span>
              <input
                type="text"
                value={draft.answerText}
                onChange={(e) =>
                  patch(draft.id, { answerText: e.target.value })
                }
                placeholder="예: ③"
                className="remind-input mt-1 text-base"
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
