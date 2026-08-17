import katex from "katex";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
import { normalizeUnderlineMarkup, renumberChoiceOptions, latexToReadableText } from "@/lib/utils/packet-content";
import { splitMixedMathSegments } from "@/lib/utils/packet-math";

type Props = {
  content: string;
  className?: string;
  /** PDF/인쇄 캡처: 가로 스크롤 UI를 만들지 않음 */
  printSafe?: boolean;
};

const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

const UNDERLINE_PATTERN = /<u>([\s\S]*?)<\/u>/g;
const FIGURE_PATTERN =
  /\[\[FIGURE:([^\]]+)\]\]|\[\[FIGURE_MISSING\]\]/g;

/** 일반 텍스트 안의 <u>...</u> 를 실제 밑줄로 렌더링 */
function renderTextWithUnderline(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(UNDERLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(text.slice(cursor, index));
    }
    nodes.push(
      <u
        key={`${keyPrefix}-u-${key++}`}
        className="underline decoration-[1.5px] underline-offset-[3px]"
      >
        {match[1]}
      </u>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

function renderKatexNode(
  expression: string,
  displayMode: boolean,
  printSafe: boolean,
  key: string,
): ReactNode {
  let html = "";
  try {
    html = katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });
  } catch {
    html = "";
  }
  if (!html) {
    return <span key={key}>{latexToReadableText(expression) || expression}</span>;
  }
  const Tag = displayMode ? "div" : "span";
  return (
    <Tag
      key={key}
      className={
        displayMode
          ? printSafe
            ? "my-2 max-w-full overflow-hidden py-0.5 text-center"
            : "my-3 overflow-x-auto py-1 text-center"
          : ""
      }
      style={
        printSafe && displayMode
          ? { overflow: "hidden", overflowX: "hidden", maxWidth: "100%" }
          : undefined
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** `$` 없이 남은 \frac · \sqrt 등을 KaTeX로 */
function renderBareLatexRun(
  text: string,
  keyPrefix: string,
  printSafe: boolean,
): ReactNode[] {
  return splitMixedMathSegments(text).map((seg, i) => {
    if (seg.type === "math") {
      return renderKatexNode(seg.value, false, printSafe, `${keyPrefix}-${i}`);
    }
    return (
      <span key={`${keyPrefix}-t-${i}`}>
        {renderTextWithUnderline(seg.value, `${keyPrefix}-u-${i}`)}
      </span>
    );
  });
}

function renderPlainSlice(
  text: string,
  keyPrefix: string,
  printSafe: boolean,
): ReactNode[] {
  if (/\\[a-zA-Z]+/.test(text)) {
    return renderBareLatexRun(text, `${keyPrefix}-bare`, printSafe);
  }
  return renderTextWithUnderline(text, keyPrefix);
}

/**
 * 일반 문장과 LaTeX 수식이 섞인 AI 추출 결과를 KaTeX로 조판한다.
 * 원문 텍스트는 React가 이스케이프하고, 수식 HTML만 KaTeX가 생성한다.
 * 텍스트 구간의 <u>...</u> 는 밑줄로 표시한다.
 */
function renderTextAndMath(
  content: string,
  keyPrefix: string,
  printSafe: boolean,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of content.matchAll(MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(
        ...renderPlainSlice(
          content.slice(cursor, index),
          `${keyPrefix}-t-${key}`,
          printSafe,
        ),
      );
    }

    const expression = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    const displayMode = Boolean(match[1] ?? match[3]);
    nodes.push(renderKatexNode(expression, displayMode, printSafe, `${keyPrefix}-math-${key++}`));
    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    nodes.push(
      ...renderPlainSlice(
        content.slice(cursor),
        `${keyPrefix}-t-end-${key}`,
        printSafe,
      ),
    );
  }
  return nodes;
}

function isSafeFigureUrl(url: string): boolean {
  return (
    /^https:\/\//i.test(url) ||
    /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(url)
  );
}

export function LatexContent({
  content,
  className = "",
  printSafe = false,
}: Props) {
  const normalized = renumberChoiceOptions(normalizeUnderlineMarkup(content));
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let figureKey = 0;

  for (const match of normalized.matchAll(FIGURE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(
        ...renderTextAndMath(
          normalized.slice(cursor, index),
          `segment-${figureKey}`,
          printSafe,
        ),
      );
    }

    const url = match[1]?.trim() ?? "";
    if (isSafeFigureUrl(url)) {
      nodes.push(
        <figure
          key={`figure-${figureKey++}`}
          className="my-4 overflow-hidden rounded-xl border border-[var(--rm-border)] bg-white p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="문제에 포함된 그래프 또는 그림"
            className="mx-auto max-h-[28rem] max-w-full object-contain"
          />
        </figure>,
      );
    } else {
      nodes.push(
        <aside
          key={`figure-fallback-${figureKey++}`}
          className="my-4 rounded-xl border border-dashed border-[var(--rm-warning)] bg-[color-mix(in_srgb,var(--rm-warning)_10%,transparent)] px-4 py-3 font-sans text-sm leading-6 text-[var(--rm-text)]"
          role="note"
        >
          그림을 불러오지 못했어요. 원본 사진에서 그래프·도표를 확인해 주세요.
        </aside>,
      );
    }
    cursor = index + match[0].length;
  }

  if (cursor < normalized.length) {
    nodes.push(
      ...renderTextAndMath(
        normalized.slice(cursor),
        `segment-end-${figureKey}`,
        printSafe,
      ),
    );
  }

  return (
    <div
      className={`latex-content whitespace-pre-wrap break-words font-serif leading-8 text-[var(--rm-text)] ${className}`}
    >
      {nodes}
    </div>
  );
}
