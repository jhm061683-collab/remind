type TextField = HTMLInputElement | HTMLTextAreaElement;

export function insertAtSelection(
  el: TextField | null,
  current: string,
  snippet: string,
  caretOffset?: number,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet + current.slice(end);
  const caret = start + (caretOffset != null ? caretOffset : snippet.length);
  return { next, caret };
}

export function restoreCaret(el: TextField | null, caret: number): void {
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}
