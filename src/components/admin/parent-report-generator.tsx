"use client";

import { useState, useTransition } from "react";
import { createParentReportAction } from "@/lib/actions/parent-reports";

type Props = {
  studentId: string;
  studentName: string;
};

export function ParentReportGenerator({ studentId, studentName }: Props) {
  const [periodDays, setPeriodDays] = useState(30);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function absoluteUrl(path: string): string {
    return new URL(path, window.location.origin).toString();
  }

  function createReport() {
    setMessage(null);
    // 비동기 생성이 끝난 뒤 열면 모바일 브라우저가 팝업으로 차단할 수 있다.
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.document.title = "보고서 생성 중…";
      previewWindow.document.body.innerHTML =
        '<p style="font-family:sans-serif;padding:24px">보고서를 만들고 있습니다…</p>';
    }
    startTransition(async () => {
      const result = await createParentReportAction({ studentId, periodDays });
      if (result.error || !result.path) {
        previewWindow?.close();
        setMessage(result.error ?? "보고서를 만들지 못했습니다.");
        return;
      }
      setReportPath(result.path);
      setMessage("보고서를 만들었습니다. 30일 동안 공유할 수 있어요.");
      if (previewWindow) {
        previewWindow.location.href = result.path;
      } else {
        window.location.href = result.path;
      }
    });
  }

  async function copyLink() {
    if (!reportPath) return;
    const url = absoluteUrl(reportPath);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("공유 링크를 복사했습니다.");
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", url);
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
      <h3 className="font-semibold text-slate-950">학부모 안심 보고서</h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {studentName} 학생의 오답 누적·복습 완료율·상세 현황을 수동으로
        생성합니다. 자동 문자나 알림톡은 발송하지 않습니다.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-700">
          보고 기간
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            className="ml-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
          >
            <option value={14}>최근 14일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
            <option value={180}>최근 6개월</option>
            <option value={365}>최근 1년</option>
          </select>
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={createReport}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "보고서 만드는 중…" : "보고서 생성"}
        </button>
      </div>

      {reportPath ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={reportPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800"
          >
            보고서 열기 · PDF 저장
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800"
          >
            링크 복사
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs font-medium text-slate-700">{message}</p>
      ) : null}
    </section>
  );
}
