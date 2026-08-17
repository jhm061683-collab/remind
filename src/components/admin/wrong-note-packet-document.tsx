"use client";

import type { CSSProperties } from "react";
import { LatexContent } from "@/components/math/latex-content";
import { MathAnswerView } from "@/components/math/math-answer-view";
import type { WrongNotePacketData } from "@/lib/server/admin/wrong-note-packet";
import { parseMathLikeAnswer } from "@/lib/utils/packet-math";
import {
  PACKET_ANSWER_MATH_CSS,
  isTallQuickAnswerMath,
  itemGapToPreviewPx,
  normalizePacketPdfSettings,
  packetPdfSettingsVersion,
  type NormalizedPacketPdfSettings,
} from "@/lib/utils/packet-pdf-settings";

type Props = {
  data: WrongNotePacketData;
  settings?: NormalizedPacketPdfSettings | unknown;
};

const ANSWER_ROWS_PER_BLOCK = 10;

function countFigures(latex?: string): number {
  if (!latex) return 0;
  return (latex.match(/\[\[FIGURE:/g) ?? []).length;
}

/** 그림 개수에 따라 카드 안 여백이 비슷해지도록 최대 높이 조절 */
function figureMaxHeightPx(figureCount: number): number {
  if (figureCount >= 4) return 72;
  if (figureCount === 3) return 88;
  if (figureCount === 2) return 112;
  if (figureCount === 1) return 148;
  return 148;
}

/** PDF 캡처용 레이아웃 — 원본 사진 제외, 본문 그림만 포함, full=전폭 */
export function WrongNotePacketDocument({ data, settings: settingsInput }: Props) {
  const settings = normalizePacketPdfSettings(settingsInput);
  const itemGapPx = itemGapToPreviewPx(settings.itemGap);
  const settingsVersion = packetPdfSettingsVersion(settings);
  const answerChunks: (typeof data.items)[] = [];
  for (let i = 0; i < data.items.length; i += ANSWER_ROWS_PER_BLOCK) {
    answerChunks.push(data.items.slice(i, i + ANSWER_ROWS_PER_BLOCK));
  }

  return (
    <article
      className="wrong-note-packet-doc bg-white text-slate-900"
      data-pdf-settings-version={settingsVersion}
      data-item-gap={settings.itemGap}
      style={{
        width: 794,
        minWidth: 794,
        maxWidth: 794,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        ${PACKET_ANSWER_MATH_CSS}
        /* 블록 단위 캡처 시에도 적용되도록 조상 클래스에 의존하지 않음 */
        .packet-problem-body img {
          max-height: var(--packet-fig-max, 148px) !important;
          width: auto !important;
          max-width: 100% !important;
          object-fit: contain !important;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .packet-problem-body figure {
          margin-top: 0.35rem !important;
          margin-bottom: 0.35rem !important;
          padding: 0.25rem !important;
          border-radius: 0.375rem !important;
        }
        .wrong-note-packet-doc table,
        .wrong-note-packet-doc tr,
        .wrong-note-packet-doc td {
          overflow: visible !important;
          height: auto;
          max-height: none;
        }
      `}</style>

      <section
        data-pdf-block="cover"
        data-pdf-span="full"
        className="flex flex-col justify-between border-b border-slate-200 px-10 py-12"
      >
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            {data.academyName}
          </p>
          <h1 className="mt-6 text-3xl font-black leading-tight text-slate-950">
            오답 모음
          </h1>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {data.studentName}
          </p>
          <dl className="mt-8 space-y-2 text-sm text-slate-700">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">반</dt>
              <dd>{data.classLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">기간</dt>
              <dd>
                {data.periodLabel} ({data.periodStart} ~ {data.periodEnd})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">과목</dt>
              <dd>{data.subjectFilterLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">단계</dt>
              <dd>{data.phaseFilterLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">상태</dt>
              <dd>{data.statusFilterLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">문항</dt>
              <dd>
                {data.items.length}개
                {data.truncated ? " (최대 80개까지 포함)" : ""}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">작성일</dt>
              <dd>{data.generatedAtLabel}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-10 text-xs text-slate-400">
          Re:mind · 원본 사진 제외 · 정리된 본문·그림만 · A4 2단
        </p>
      </section>

      <div
        className="packet-items-grid grid grid-cols-2 px-2 py-2"
        style={{ gap: itemGapPx }}
      >
        {data.items.map((item) => {
          const figCount = countFigures(item.problemLatex);
          const figMax = figureMaxHeightPx(figCount);
          return (
            <div
              key={item.id}
              data-pdf-block={`item-${item.number}`}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2"
            >
              <div className="flex flex-wrap items-baseline gap-1.5 text-[11px]">
                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.number}
                </span>
                <span className="font-semibold text-slate-800">
                  {item.subjectName}
                </span>
                <span className="text-slate-400">{item.createdDateLabel}</span>
              </div>

              {item.problemLatex ? (
                <div
                  className="packet-problem-body mt-1.5 rounded border border-slate-100 bg-slate-50 px-2 py-1.5 [&_aside]:my-1.5 [&_aside]:px-2 [&_aside]:py-1.5 [&_aside]:text-[10px] [&_aside]:leading-4"
                  style={
                    {
                      "--packet-fig-max": `${figMax}px`,
                    } as CSSProperties
                  }
                >
                  <LatexContent
                    content={item.problemLatex}
                    className="text-[12px] leading-5 text-slate-900"
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                  정리된 문제 본문이 없어요.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <section
        data-pdf-block="answers-header"
        data-pdf-span="full"
        data-pdf-break="before"
        className="border-t-4 border-slate-900 px-5 py-3"
      >
        <h2 className="text-lg font-bold text-slate-950">빠른정답</h2>
      </section>

      <div
        className="packet-items-grid grid grid-cols-2 px-2 pb-3"
        style={{ gap: itemGapPx }}
      >
        {answerChunks.map((chunk, chunkIndex) => (
          <section
            key={`answers-${chunkIndex}`}
            data-pdf-block={`answers-${chunkIndex}`}
            className="rounded-md border border-slate-200 px-2 py-2"
          >
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="w-8 py-1 pr-1 font-bold">번호</th>
                  <th className="w-14 py-1 pr-1 font-bold">과목</th>
                  <th className="py-1 font-bold">정답</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((item) => {
                  const answerPlan = parseMathLikeAnswer(item.answerText);
                  const isMath = answerPlan.kind === "math";
                  const tall =
                    isMath &&
                    answerPlan.segments.some(
                      (seg) =>
                        seg.type === "math" && isTallQuickAnswerMath(seg.value),
                    );
                  return (
                    <tr
                      key={`ans-${item.id}`}
                      className="border-b border-slate-100"
                    >
                      <td className="py-1.5 pr-1 align-middle font-semibold">
                        {item.number}
                      </td>
                      <td className="py-1.5 pr-1 align-middle text-slate-600">
                        {item.subjectName}
                      </td>
                      <td
                        className={
                          isMath
                            ? `packet-answer-math-cell${tall ? " packet-answer-math-cell--tall" : ""}`
                            : "packet-answer-plain-cell"
                        }
                      >
                        {item.answerText ? (
                          <MathAnswerView
                            content={item.answerText}
                            answerCell
                            className="text-[11px] text-slate-900"
                          />
                        ) : (
                          <span className="text-slate-400">미등록</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </article>
  );
}
