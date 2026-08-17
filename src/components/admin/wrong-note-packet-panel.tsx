"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getWrongNotePacketAction } from "@/lib/actions/wrong-note-packet";
import { WrongNotePacketDocument } from "@/components/admin/wrong-note-packet-document";
import "katex/dist/katex.min.css";
import {
  DEFAULT_WRONG_NOTE_PACKET_PHASES,
  WRONG_NOTE_PACKET_PHASES,
  type WrongNotePacketData,
  type WrongNotePacketPeriod,
  type WrongNotePacketPhase,
  type WrongNotePacketStatusFilter,
} from "@/lib/server/admin/wrong-note-packet";
import { downloadWrongNotePacketTextPdf } from "@/components/admin/wrong-note-packet-pdf";
import {
  DEFAULT_PACKET_PDF_ITEM_GAP,
  PACKET_ITEM_GAP_OPTIONS,
  findVerticallyClippedMathCells,
  isMathCellVerticallyComfortable,
  normalizePacketPdfSettings,
  packetPdfSettingsVersion,
  runExclusiveDownload,
  type PacketItemGap,
} from "@/lib/utils/packet-pdf-settings";
import { getPhaseLabel } from "@/lib/utils/labels";
import { toDateKey } from "@/lib/utils/date-range";

type Props = {
  studentId: string;
  studentName: string;
};

type PeriodUi = "7d" | "14d" | "30d" | "month" | "90d" | "custom";

function buildPeriod(
  ui: PeriodUi,
  customStart: string,
  customEnd: string,
): WrongNotePacketPeriod | { error: string } {
  if (ui === "custom") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(customStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(customEnd)
    ) {
      return { error: "기간 시작·끝 날짜를 YYYY-MM-DD로 입력해 주세요." };
    }
    return { kind: "custom", start: customStart, end: customEnd };
  }
  if (ui === "90d") return { kind: "days", days: 90 };
  if (ui === "7d" || ui === "14d" || ui === "30d" || ui === "month") {
    return { kind: "preset", preset: ui };
  }
  return { kind: "days", days: 30 };
}

function readMathClipProbes(root: HTMLElement) {
  return [...root.querySelectorAll(".packet-answer-math-cell, .packet-answer-math")].map(
    (node) => {
      const el = node as HTMLElement;
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: window.getComputedStyle(el).overflowY,
      };
    },
  );
}

export function WrongNotePacketPanel({ studentId, studentName }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const downloadLockRef = useRef(false);
  const loadGenRef = useRef(0);
  const [periodUi, setPeriodUi] = useState<PeriodUi>("30d");
  const today = toDateKey(new Date());
  const [customStart, setCustomStart] = useState(today.slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(today);
  const [subjectId, setSubjectId] = useState<string>("all");
  const [status, setStatus] = useState<WrongNotePacketStatusFilter>("all");
  const [phases, setPhases] = useState<WrongNotePacketPhase[]>([
    ...DEFAULT_WRONG_NOTE_PACKET_PHASES,
  ]);
  const [itemGap, setItemGap] = useState<PacketItemGap>(
    DEFAULT_PACKET_PDF_ITEM_GAP,
  );
  const pdfSettings = normalizePacketPdfSettings({ itemGap });
  const pdfSettingsRef = useRef(pdfSettings);
  pdfSettingsRef.current = pdfSettings;
  const [data, setData] = useState<WrongNotePacketData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{
    label: string;
    percent: number;
  } | null>(null);

  function togglePhase(phase: WrongNotePacketPhase) {
    setPhases((prev) =>
      prev.includes(phase)
        ? prev.filter((p) => p !== phase)
        : [...prev, phase],
    );
  }

  function resetLayoutSettings() {
    setItemGap(DEFAULT_PACKET_PDF_ITEM_GAP);
  }

  function loadPreview() {
    setMessage(null);
    if (phases.length === 0) {
      setMessage("복습 단계를 하나 이상 선택해 주세요.");
      return;
    }
    const period = buildPeriod(periodUi, customStart, customEnd);
    if ("error" in period) {
      setMessage(period.error);
      return;
    }
    startTransition(async () => {
      const gen = ++loadGenRef.current;
      const result = await getWrongNotePacketAction({
        studentId,
        period,
        subjectId,
        status,
        phases,
      });
      if (gen !== loadGenRef.current) return;
      if (result.error || !result.data) {
        setData(null);
        setMessage(result.error ?? "미리보기를 만들지 못했습니다.");
        return;
      }
      setData(result.data);
      if (result.data.items.length === 0) {
        setMessage(
          "선택한 조건에 해당하는 오답이 없어요. 기간·과목·단계·상태를 바꿔 보세요.",
        );
      } else if (result.data.truncated) {
        setMessage("문항이 많아 앞에서부터 80개만 포함했어요.");
      } else {
        setMessage(`${result.data.items.length}문항 미리보기 준비됨`);
      }
    });
  }

  useEffect(() => {
    loadPreview();
    // 첫 진입 시 기본 필터로 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function downloadPdf() {
    if (!data || data.items.length === 0) {
      setMessage("먼저 미리보기를 만들어 주세요.");
      return;
    }
    const settingsSnapshot = pdfSettingsRef.current;
    setDownloading(true);
    setProgress({ label: "PDF 준비 중…", percent: 0 });
    setMessage(null);
    try {
      await runExclusiveDownload(downloadLockRef, async () => {
        const safeName = studentName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
        const fileName = `${safeName}_오답모음_${data.periodStart}_${data.periodEnd}.pdf`;
        await downloadWrongNotePacketTextPdf(
          data,
          fileName,
          (p) => {
            setProgress(p);
          },
          settingsSnapshot,
        );
      });
      setMessage("PDF 다운로드를 시작했어요. (수능형 2단)");
    } catch (err) {
      console.error("[WrongNotePacketPanel] pdf", err);
      const busy =
        err instanceof Error && err.message === "PDF_DOWNLOAD_IN_PROGRESS";
      setMessage(
        busy
          ? "이미 PDF를 만들고 있어요. 끝나면 다시 눌러 주세요."
          : "PDF 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  const subjectOptions = data?.subjectOptions ?? [];

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const clipped = findVerticallyClippedMathCells(readMathClipProbes(root));
    if (clipped.length > 0) {
      console.warn("[packet-preview] math cell clipped", clipped.length);
    }
    const tight = [...root.querySelectorAll(".packet-answer-math-cell")].filter(
      (node) => {
        const cell = node as HTMLElement;
        const math = cell.querySelector(".katex, .packet-answer-math");
        if (!math) return false;
        const cellBox = cell.getBoundingClientRect();
        const mathBox = math.getBoundingClientRect();
        return !isMathCellVerticallyComfortable({
          topGap: mathBox.top - cellBox.top,
          bottomGap: cellBox.bottom - mathBox.bottom,
        });
      },
    );
    if (tight.length > 0) {
      console.warn("[packet-preview] math cell tight", tight.length);
    }
  }, [data, pdfSettings.itemGap]);

  return (
    <section
      data-tour-id="admin-packet-pdf"
      className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm"
    >
      <h3 className="font-semibold text-[var(--rm-text)]">오답 모음 PDF</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--rm-text-muted)]">
        {studentName} 학생 오답을 표지 · 문제편(텍스트 조판 · A4 2단) ·
        빠른정답(마지막 문제 다음 페이지)으로 바로 받아요. 원본 사진은 넣지
        않아요. 학부모 통계 보고서와는 별개입니다. 기간은 문제 등록일
        기준입니다.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium text-[var(--rm-text)]">
          기간(등록일)
          <select
            value={periodUi}
            onChange={(e) => setPeriodUi(e.target.value as PeriodUi)}
            className="ml-2 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
          >
            <option value="7d">최근 7일</option>
            <option value="14d">최근 14일</option>
            <option value="30d">최근 30일</option>
            <option value="month">이번 달</option>
            <option value="90d">최근 90일</option>
            <option value="custom">직접 지정</option>
          </select>
        </label>

        {periodUi === "custom" ? (
          <>
            <label className="text-sm text-[var(--rm-text)]">
              시작
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="ml-2 rounded-xl border border-[var(--rm-border)] px-2 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-[var(--rm-text)]">
              끝
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="ml-2 rounded-xl border border-[var(--rm-border)] px-2 py-2 text-sm"
              />
            </label>
          </>
        ) : null}

        <label className="text-sm font-medium text-[var(--rm-text)]">
          과목
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="ml-2 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[var(--rm-text)]">
          상태
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as WrongNotePacketStatusFilter)
            }
            className="ml-2 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value="active">다시 푸는 중</option>
            <option value="archived">보관 완료</option>
          </select>
        </label>

        <label className="text-sm font-medium text-[var(--rm-text)]">
          문항 간격
          <select
            value={itemGap}
            onChange={(e) => setItemGap(e.target.value as PacketItemGap)}
            className="ml-2 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm"
            data-testid="packet-item-gap"
          >
            {PACKET_ITEM_GAP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
        문항 간격은 바꾸면 미리보기에 바로 반영되고, 같은 값으로 PDF가
        만들어져요.
      </p>

      <div className="mt-3">
        <p className="mb-1.5 text-sm font-medium text-[var(--rm-text)]">
          복습 단계
        </p>
        <div className="flex flex-wrap gap-2">
          {WRONG_NOTE_PACKET_PHASES.map((phase) => {
            const checked = phases.includes(phase);
            return (
              <label
                key={phase}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  checked
                    ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_12%,white)] text-[var(--rm-text)]"
                    : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text-muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePhase(phase)}
                  className="h-3.5 w-3.5 accent-[var(--rm-brand)]"
                />
                {getPhaseLabel(phase)}
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
          기본은 단기·중기·장기입니다. 완료 문항도 넣으려면 체크하세요.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || downloading}
          onClick={loadPreview}
          className="rounded-xl bg-[var(--rm-brand)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "불러오는 중…" : "미리보기"}
        </button>
        <button
          type="button"
          disabled={pending || downloading}
          onClick={resetLayoutSettings}
          className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-2 text-sm font-semibold text-[var(--rm-text)] disabled:opacity-50"
        >
          초기화
        </button>
        <button
          type="button"
          disabled={pending || downloading || !data || data.items.length === 0}
          onClick={() => void downloadPdf()}
          className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-2 text-sm font-semibold text-[var(--rm-text)] disabled:opacity-50"
          data-testid="packet-pdf-download"
        >
          {downloading ? "PDF 만드는 중…" : "PDF 다운로드"}
        </button>
      </div>

      {progress ? (
        <div className="mt-3 rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--rm-text-on-info)]">
            <span>{progress.label}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-[var(--rm-brand)] transition-[width] duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs font-medium text-[var(--rm-text-muted)]">
          {message}
        </p>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="mt-4 overflow-auto rounded-xl border border-[var(--rm-border)] bg-slate-100 p-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-600">
            미리보기 (이 내용이 PDF로 저장돼요) ·{" "}
            {packetPdfSettingsVersion(pdfSettings)}
          </p>
          <div
            ref={previewRef}
            className="max-h-[70vh] overflow-auto"
            style={{ minWidth: 0 }}
            data-pdf-settings-version={packetPdfSettingsVersion(pdfSettings)}
          >
            <div style={{ width: 794, minWidth: 794 }}>
              <WrongNotePacketDocument data={data} settings={pdfSettings} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
