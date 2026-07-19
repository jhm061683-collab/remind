import katex from "katex";
import type { ReactNode } from "react";

type Props = {
  content: string;
  className?: string;
};

const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

const UNDERLINE_PATTERN = /<u>([\s\S]*?)<\/u>/g;

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

/**
 * 일반 문장과 LaTeX 수식이 섞인 AI 추출 결과를 KaTeX로 조판한다.
 * 원문 텍스트는 React가 이스케이프하고, 수식 HTML만 KaTeX가 생성한다.
 * 텍스트 구간의 <u>...</u> 는 밑줄로 표시한다.
 */
export function LatexContent({ content, className = "" }: Props) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of content.matchAll(MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(
        ...renderTextWithUnderline(content.slice(cursor, index), `t-${key}`),
      );
    }

    const expression = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
    const displayMode = Boolean(match[1] ?? match[3]);
    const html = katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });

    const Tag = displayMode ? "div" : "span";
    nodes.push(
      <Tag
        key={`math-${key++}`}
        className={displayMode ? "my-3 overflow-x-auto py-1 text-center" : ""}
        dangerouslySetInnerHTML={{ __html: html }}
      />,
    );
    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    nodes.push(
      ...renderTextWithUnderline(content.slice(cursor), `t-end-${key}`),
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
