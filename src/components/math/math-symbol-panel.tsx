"use client";

import { useRef, useState } from "react";
import { insertAtSelection, restoreCaret } from "@/lib/math/insert-at-cursor";
import { MATH_SYMBOL_GROUPS, type MathSymbolItem } from "@/lib/math/symbol-groups";

type Props = {
  onInsert: (item: MathSymbolItem) => void;
};

export function MathSymbolToggle({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
        className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold touch-manipulation ${
          open
            ? "border-[var(--rm-nav-active)] bg-[color-mix(in_srgb,var(--rm-nav-active)_12%,transparent)] text-[var(--rm-nav-active)]"
            : "border-[var(--rm-border)] bg-[var(--rm-surface-raised)] text-[var(--rm-text)]"
        }`}
      >
        수학기호 {open ? "끄기" : "켜기"}
      </button>
      {open ? <MathSymbolPanel onInsert={onInsert} /> : null}
    </div>
  );
}

type TextareaProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
};

export function MathAwareTextarea({
  value,
  onChange,
  rows = 7,
  className = "",
  placeholder,
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        placeholder={placeholder}
      />
      <MathSymbolToggle
        onInsert={(item) => {
          const el = ref.current;
          const { next, caret } = insertAtSelection(
            el,
            value,
            item.insert,
            item.caretOffset,
          );
          onChange(next);
          restoreCaret(el, caret);
        }}
      />
    </div>
  );
}

export function MathSymbolPanel({ onInsert }: Props) {
  return (
    <div className="mt-2 max-h-[min(40vh,22rem)] space-y-2.5 overflow-y-auto rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
      {MATH_SYMBOL_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 text-[11px] font-semibold text-[var(--rm-text-muted)]">
            {group.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.title ?? item.label}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onInsert(item);
                }}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 text-base font-semibold text-[var(--rm-text)] touch-manipulation active:bg-[var(--rm-accent-muted)]"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
