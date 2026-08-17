"use client";

import { AnswerMathInput } from "@/components/student/answer-math-input";
import { LatexContent } from "@/components/math/latex-content";
import { MathAwareTextarea } from "@/components/math/math-symbol-panel";
import { embedProblemFigures } from "@/lib/utils/problem-figures";

export type ProblemDraft = {
  id: string;
  selected: boolean;
  number: string;
  /** 문항만 (공통 지문 제외) */
  bodyLatex: string;
  answerText: string;
  keywords: string[];
  /** 원본 사진에서 잘라낸 그래프·도형·표 */
  figureDataUrls: string[];
  editing: boolean;
};

type Props = {
  sharedPassage: string;
  drafts: ProblemDraft[];
  onChange: (next: ProblemDraft[]) => void;
  onSharedPassageChange: (value: string) => void;
  /** 수학 과목이면 분수·로그·루트 버튼 표시 */
  showMathTools?: boolean;
};

export function ProblemDraftList({
  sharedPassage,
  drafts,
  onChange,
  onSharedPassageChange,
  showMathTools = false,
}: Props) {
  const selectedCount = drafts.filter((d) => d.selected).length;

  function patch(id: string, patch: Partial<ProblemDraft>) {
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  if (drafts.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <p className="rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-3 py-2 text-[11px] leading-4 text-[var(--rm-text-on-info)]">
        {drafts.length > 1
          ? `사진에서 문제 ${drafts.length}개를 찾았어요. 등록할 문항만 고르고, 정답은 직접 입력해 주세요.`
          : "AI는 문제만 정리해요. 정답은 직접 입력해 주세요."}
      </p>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--rm-text)]">
          {drafts.length > 1
            ? `문제 ${drafts.length}개로 나눴어요 (${selectedCount}개 선택)`
            : `AI가 읽은 문항 (${selectedCount}/${drafts.length}개 선택)`}
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

      <div className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)]">
          <p className="border-b border-[var(--rm-border)] px-3 py-2 text-[11px] font-bold text-[var(--rm-text-muted)]">
            공통 지문 (국어·영어 · 선택 · 추가 AI 비용 없음)
          </p>
          <textarea
            rows={5}
            value={sharedPassage}
            onChange={(e) => onSharedPassageChange(e.target.value)}
            className="remind-input w-full rounded-none border-0 font-serif text-sm leading-6"
            placeholder="지문이 있으면 여기에 두고, 아래 문항에는 문제만 남겨 주세요."
          />
        </div>

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
              <MathAwareTextarea
                rows={7}
                value={draft.bodyLatex}
                onChange={(bodyLatex) => patch(draft.id, { bodyLatex })}
                className="remind-input w-full font-mono text-sm leading-6"
                placeholder="문항 본문 (수식은 $...$)"
              />
            </div>
          ) : (
            <LatexContent
              content={embedProblemFigures(
                draft.bodyLatex,
                draft.figureDataUrls,
              )}
              className="max-h-[min(28rem,70vh)] overflow-auto px-4 py-3 text-[15px]"
            />
          )}

          <div className="border-t border-[var(--rm-border)] px-3 py-2">
            <AnswerMathInput
              value={draft.answerText}
              onChange={(answerText) => patch(draft.id, { answerText })}
              required={draft.selected}
              showMathTools={showMathTools}
              placeholder={
                showMathTools ? "예: ③ · 분수·로그·루트 버튼 사용" : "예: ③ 또는 119°"
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
