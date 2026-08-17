export type MathSymbolItem = {
  id: string;
  /** 버튼에 보이는 기호 */
  label: string;
  /** 커서 위치에 넣을 문자열 */
  insert: string;
  /** insert 시작부터 커서 이동량. 없으면 끝 */
  caretOffset?: number;
  title?: string;
};

export type MathSymbolGroup = {
  id: string;
  title: string;
  items: MathSymbolItem[];
};

/** 중고등 수학 입력용 기호. 나중에 항목만 추가하면 된다. */
export const MATH_SYMBOL_GROUPS: MathSymbolGroup[] = [
  {
    id: "compare",
    title: "부등호",
    items: [
      { id: "lt", label: "<", insert: "<", title: "작다" },
      { id: "gt", label: ">", insert: ">", title: "크다" },
      { id: "le", label: "≤", insert: "≤", title: "작거나 같다" },
      { id: "ge", label: "≥", insert: "≥", title: "크거나 같다" },
      { id: "ne", label: "≠", insert: "≠", title: "같지 않다" },
      { id: "eq", label: "=", insert: "=", title: "같다" },
    ],
  },
  {
    id: "ops",
    title: "연산",
    items: [
      { id: "pm", label: "±", insert: "±" },
      { id: "mp", label: "∓", insert: "∓" },
      { id: "times", label: "×", insert: "×" },
      { id: "div", label: "÷", insert: "÷" },
      { id: "cdot", label: "·", insert: "·" },
    ],
  },
  {
    id: "struct",
    title: "분수·루트",
    items: [
      { id: "sqrt", label: "√", insert: "\\sqrt{}", caretOffset: 6, title: "루트" },
      { id: "frac", label: "a/b", insert: "\\frac{}{}", caretOffset: 6, title: "분수" },
      { id: "sq", label: "□²", insert: "^{2}", title: "제곱" },
      { id: "cu", label: "□³", insert: "^{3}", title: "세제곱" },
      { id: "abs", label: "| |", insert: "||", caretOffset: 1, title: "절댓값" },
    ],
  },
  {
    id: "set",
    title: "집합",
    items: [
      { id: "in", label: "∈", insert: "∈" },
      { id: "notin", label: "∉", insert: "∉" },
      { id: "subset", label: "⊂", insert: "⊂" },
      { id: "subseteq", label: "⊆", insert: "⊆" },
      { id: "supset", label: "⊃", insert: "⊃" },
      { id: "supseteq", label: "⊇", insert: "⊇" },
      { id: "cup", label: "∪", insert: "∪" },
      { id: "cap", label: "∩", insert: "∩" },
      { id: "empty", label: "∅", insert: "∅" },
    ],
  },
  {
    id: "geo",
    title: "기하",
    items: [
      { id: "angle", label: "∠", insert: "∠" },
      { id: "parallel", label: "∥", insert: "∥" },
      { id: "perp", label: "⟂", insert: "⟂" },
      { id: "tri", label: "△", insert: "△" },
      { id: "deg", label: "°", insert: "°" },
    ],
  },
  {
    id: "misc",
    title: "기타",
    items: [
      { id: "therefore", label: "∴", insert: "∴" },
      { id: "because", label: "∵", insert: "∵" },
      { id: "infty", label: "∞", insert: "∞" },
      { id: "cong", label: "≅", insert: "≅" },
      { id: "approx", label: "≈", insert: "≈" },
    ],
  },
];
