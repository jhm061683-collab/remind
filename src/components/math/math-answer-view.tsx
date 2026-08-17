"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { parseMathLikeAnswer } from "@/lib/utils/packet-math";
import { latexToReadableText } from "@/lib/utils/packet-content";
import {
  PACKET_ANSWER_MATH_CSS,
  isTallQuickAnswerMath,
} from "@/lib/utils/packet-pdf-settings";

function ensureAnswerMathCss() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(
    "packet-answer-math-css",
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "packet-answer-math-css";
    document.head.appendChild(style);
  }
  style.textContent = PACKET_ANSWER_MATH_CSS;
}

type Props = {
  content: string;
  className?: string;
  /** 빠른정답 표 셀 — display math로 레이아웃 높이를 실제 글리프에 맞춘다 */
  answerCell?: boolean;
};

function renderMathHtml(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "html",
    });
  } catch {
    return "";
  }
}

/**
 * 빠른정답·정답 미리보기용.
 * 상태 문자열은 그대로, 수식은 KaTeX, raw LaTeX 명령은 화면에 남기지 않는다.
 */
export function MathAnswerView({
  content,
  className = "",
  answerCell = false,
}: Props) {
  ensureAnswerMathCss();
  const source = (content ?? "").trim();
  if (!source) {
    return <span className={`text-slate-400 ${className}`}>미등록</span>;
  }

  const plan = parseMathLikeAnswer(source);
  if (plan.kind === "status" || plan.kind === "plain") {
    return <span className={className}>{plan.text}</span>;
  }

  const tall = plan.segments.some(
    (seg) => seg.type === "math" && isTallQuickAnswerMath(seg.value),
  );
  const onlyMath = plan.segments.every((seg) => seg.type === "math");
  const displayMode = answerCell && (onlyMath || tall);

  return (
    <span
      className={`packet-answer-math ${answerCell ? "packet-answer-math--cell" : ""} ${tall ? "packet-answer-math--tall" : ""} ${className}`.trim()}
    >
      {plan.segments.map((seg, i) => {
        if (seg.type !== "math") {
          return (
            <span key={`t-${i}`} className="whitespace-pre-wrap">
              {seg.value}
            </span>
          );
        }
        const html = renderMathHtml(seg.value, displayMode);
        if (!html) {
          return (
            <span key={`m-${i}`}>
              {latexToReadableText(seg.value) || seg.value}
            </span>
          );
        }
        return (
          <span
            key={`m-${i}`}
            className="packet-answer-math-katex [&_.katex]:text-[1em]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
