"use client";

import { useRef, useState } from "react";
import { MathAnswerView } from "@/components/math/math-answer-view";
import { MathSymbolToggle } from "@/components/math/math-symbol-panel";
import type { MathSymbolItem } from "@/lib/math/symbol-groups";
import { insertAtSelection, restoreCaret } from "@/lib/math/insert-at-cursor";
import {
  convertFriendlyAnswer,
  friendlyFracSnippet,
  friendlyLogSnippet,
  friendlyPowSnippet,
  friendlySqrtSnippet,
  isLatexAnswer,
  latexToFriendly,
} from "@/lib/utils/normalize-answer";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  showMathTools?: boolean;
  className?: string;
};

type BuilderKind = "frac" | "sqrt" | "log" | "pow" | null;

const CHIP_LABEL: Record<Exclude<BuilderKind, null>, string> = {
  frac: "분수",
  sqrt: "루트",
  log: "로그",
  pow: "지수",
};

export function AnswerMathInput({
  value,
  onChange,
  required = false,
  label = "정답",
  placeholder = "예: ③ 또는 119°",
  showMathTools = false,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() =>
    isLatexAnswer(value) ? latexToFriendly(value) : value,
  );
  const [builder, setBuilder] = useState<BuilderKind>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(isLatexAnswer(value) ? latexToFriendly(value) : value);
  }

  const previewSource = draft.trim()
    ? convertFriendlyAnswer(draft)
    : value.trim();
  const showPreview =
    Boolean(previewSource) &&
    (showMathTools || isLatexAnswer(previewSource) || /[√^/]|log/i.test(draft));

  function commitDraft(nextDraft = draft) {
    const converted = convertFriendlyAnswer(nextDraft);
    onChange(converted);
    if (converted && isLatexAnswer(converted)) {
      setDraft(latexToFriendly(converted));
    } else {
      setDraft(converted);
    }
  }

  function insertSnippet(snippet: string, cursorInSnippet?: number) {
    const el = inputRef.current;
    const { next, caret } = insertAtSelection(
      el,
      draft,
      snippet,
      cursorInSnippet,
    );
    setDraft(next);
    onChange(convertFriendlyAnswer(next));
    restoreCaret(el, caret);
  }

  function insertSymbol(item: MathSymbolItem) {
    insertSnippet(item.insert, item.caretOffset);
  }

  function applyBuilder() {
    if (!builder) return;
    let snippet = "";
    let caretOffset: number | undefined;

    if (builder === "frac") {
      if (!a.trim() || !b.trim()) return;
      snippet = friendlyFracSnippet(a, b);
    } else if (builder === "sqrt") {
      if (!a.trim()) return;
      snippet = friendlySqrtSnippet(a);
    } else if (builder === "log") {
      if (!a.trim()) return;
      snippet = friendlyLogSnippet(a, b.trim() || undefined);
    } else if (builder === "pow") {
      if (!b.trim()) return;
      // 밑이 비면 커서 위치에 ^지수만 붙여 다항식에 이어 씀 (예: x 뒤에 ^2)
      snippet = friendlyPowSnippet(a, b);
      if (!a.trim()) caretOffset = snippet.length;
    }

    if (!snippet) return;
    insertSnippet(snippet, caretOffset);
    setBuilder(null);
    setA("");
    setB("");
  }

  return (
    <div className={className}>
      <p className="remind-field-label text-[11px] font-semibold text-[var(--rm-text-muted)]">
        {label}
        {required ? <span className="text-[var(--rm-danger)]"> *</span> : null}
      </p>

      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onBlur={() => commitDraft()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          }
        }}
        placeholder={
          showMathTools
            ? "예: (1/2)x^2+2x 또는 ③"
            : placeholder
        }
        className="remind-input mt-1.5 text-base"
        autoComplete="off"
        inputMode="text"
      />

      <MathSymbolToggle onInsert={insertSymbol} />

      {showMathTools ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--rm-text-muted)]">
          예: <span className="font-medium text-[var(--rm-text)]">(1/2)x^2+2x</span>
          , <span className="font-medium text-[var(--rm-text)]">log_2(8)</span>
          . 아래 버튼으로 분수·로그 조각을 식에 넣을 수도 있어요.
        </p>
      ) : null}

      {showPreview ? (
        <div className="mt-2 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
            보이는 표기
          </p>
          <MathAnswerView
            content={previewSource}
            className="mt-0.5 text-center text-lg leading-8"
          />
        </div>
      ) : null}

      {showMathTools ? (
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11px] font-semibold text-[var(--rm-text-muted)]">
            조각 넣기
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CHIP_LABEL) as Array<Exclude<BuilderKind, null>>).map(
              (kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setBuilder((cur) => {
                      if (cur === kind) return null;
                      setA("");
                      setB(kind === "log" ? "" : "");
                      return kind;
                    });
                  }}
                  className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold touch-manipulation ${
                    builder === kind
                      ? "border-[var(--rm-nav-active)] bg-[color-mix(in_srgb,var(--rm-nav-active)_12%,transparent)] text-[var(--rm-nav-active)]"
                      : "border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text)]"
                  }`}
                >
                  {CHIP_LABEL[kind]}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => insertSnippet("π")}
              className="min-h-[40px] rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 text-sm font-semibold text-[var(--rm-text)] touch-manipulation"
            >
              π
            </button>
          </div>

          {builder ? (
            <div className="mt-2 space-y-2 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
              <p className="text-sm font-bold text-[var(--rm-text)]">
                {CHIP_LABEL[builder]} 조각 만들기
              </p>
              <p className="text-[11px] text-[var(--rm-text-muted)]">
                만든 조각이 커서 위치에 들어가요. 여러 번 넣어 식을 이어 쓸 수 있어요.
              </p>

              {builder === "frac" ? (
                <div className="flex items-center justify-center gap-2">
                  <input
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    placeholder="분자"
                    className="remind-input w-24 text-center text-base"
                    autoFocus
                  />
                  <span className="text-lg font-bold text-[var(--rm-text-muted)]">
                    /
                  </span>
                  <input
                    value={b}
                    onChange={(e) => setB(e.target.value)}
                    placeholder="분모"
                    className="remind-input w-24 text-center text-base"
                  />
                </div>
              ) : null}

              {builder === "sqrt" ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">√</span>
                  <input
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                    placeholder="루트 안 (예: x+1)"
                    className="remind-input flex-1 text-base"
                    autoFocus
                  />
                </div>
              ) : null}

              {builder === "log" ? (
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                      밑 (비우면 상용로그처럼 log만)
                    </span>
                    <input
                      value={b}
                      onChange={(e) => setB(e.target.value)}
                      placeholder="예: 2, 10, e"
                      className="remind-input mt-1 text-base"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                      진수
                    </span>
                    <input
                      value={a}
                      onChange={(e) => setA(e.target.value)}
                      placeholder="예: 8, x+1"
                      className="remind-input mt-1 text-base"
                    />
                  </label>
                </div>
              ) : null}

              {builder === "pow" ? (
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                      밑 (비우면 지금 커서 뒤에 ^만 붙음)
                    </span>
                    <input
                      value={a}
                      onChange={(e) => setA(e.target.value)}
                      placeholder="예: x  · 비우고 지수만 써도 됨"
                      className="remind-input mt-1 text-base"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                      지수
                    </span>
                    <input
                      value={b}
                      onChange={(e) => setB(e.target.value)}
                      placeholder="예: 2"
                      className="remind-input mt-1 text-base"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBuilder(null)}
                  className="min-h-[44px] rounded-xl border border-[var(--rm-border)] text-sm font-semibold"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={applyBuilder}
                  disabled={
                    builder === "frac"
                      ? !a.trim() || !b.trim()
                      : builder === "pow"
                        ? !b.trim()
                        : !a.trim()
                  }
                  className="min-h-[44px] rounded-xl bg-[var(--rm-brand)] text-sm font-bold text-white disabled:opacity-40"
                >
                  식에 넣기
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
