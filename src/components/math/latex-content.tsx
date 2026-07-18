import katex from "katex";
import type { ReactNode } from "react";

type Props = {
  content: string;
  className?: string;
};

const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

/**
 * 일반 문장과 LaTeX 수식이 섞인 AI 추출 결과를 KaTeX로 조판한다.
 * 원문 텍스트는 React가 이스케이프하고, 수식 HTML만 KaTeX가 생성한다.
 */
export function LatexContent({ content, className = "" }: Props) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of content.matchAll(MATH_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(content.slice(cursor, index));
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
    nodes.push(content.slice(cursor));
  }

  return (
    <div
      className={`latex-content whitespace-pre-wrap break-words font-serif leading-8 text-[var(--rm-text)] ${className}`}
    >
      {nodes}
    </div>
  );
}
