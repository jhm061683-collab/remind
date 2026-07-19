"use client";

import { useState } from "react";
import type { ParentReportSnapshot } from "@/lib/types/parent-report";

type Props = {
  report: ParentReportSnapshot;
  expiresAt?: string | null;
};

const PHASE_LABELS: Record<string, string> = {
  short: "단기 복습",
  medium: "중기 복습",
  long: "장기 복습",
  completed: "완료",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR");
}

export function ParentReportView({ report, expiresAt }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", window.location.href);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-wrap justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            PDF 저장 · 인쇄
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold"
          >
            {copied ? "복사 완료 ✓" : "링크 복사"}
          </button>
        </div>

        <article className="rounded-3xl bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:p-0 print:shadow-none">
          <header className="border-b-2 border-slate-900 pb-5">
            <p className="text-sm font-bold text-blue-700">Re:mind 학습 리포트</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {report.title}
            </h1>
            <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
              <p>학원: {report.academyName}</p>
              <p>
                기간: {formatDate(report.periodStart)} ~{" "}
                {formatDate(report.periodEnd)}
              </p>
              <p>
                학생: {report.studentName}
                {report.gradeLabel ? ` · ${report.gradeLabel}` : ""}
              </p>
              <p>
                담당: {report.teacherNames.join(", ") || "담당 선생님"}
              </p>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["등록 오답", `${report.summary.totalQuestions}개`],
              ["복습 완료", `${report.summary.completedQuestions}개`],
              ["완료율", `${report.summary.completionRate}%`],
              ["복습 활동", `${report.summary.totalReviews}회`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-7">
            <h2 className="text-lg font-black">과목별 학습 현황</h2>
            {report.bySubject.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                {report.bySubject.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
                  >
                    <span className="font-bold">{subject.subjectName}</span>
                    <span>{subject.count}개 등록</span>
                    <span className="text-blue-700">
                      {subject.completed}개 완료
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                해당 기간에 등록된 오답이 없습니다.
              </p>
            )}
          </section>

          <section className="mt-7">
            <h2 className="text-lg font-black">주요 오답 원인</h2>
            {report.wrongReasons.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {report.wrongReasons.map((item) => (
                  <span
                    key={item.reason}
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700"
                  >
                    {item.reason} · {item.count}회
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                기록된 오답 원인이 없습니다.
              </p>
            )}
          </section>

          <section className="mt-7">
            <h2 className="text-lg font-black">상세 오답 현황</h2>
            <div className="mt-3 space-y-2">
              {report.questions.map((question) => (
                <div
                  key={question.id}
                  className="break-inside-avoid rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">
                      {question.subjectName}
                      {question.source ? ` · ${question.source}` : ""}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                      {PHASE_LABELS[question.phase] ?? question.phase}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(question.createdAt)}
                  </p>
                  {question.wrongReason ? (
                    <p className="mt-2 text-sm">
                      <strong>오답 원인:</strong> {question.wrongReason}
                    </p>
                  ) : null}
                  {question.reflectionMemo ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {question.reflectionMemo}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>생성일: {formatDate(report.generatedAt)}</p>
            {expiresAt ? <p>공유 링크 만료일: {formatDate(expiresAt)}</p> : null}
            <p className="mt-1">
              이 보고서는 학원 상담을 위해 선택하여 생성한 학습 기록입니다.
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
