"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createParentReportAction,
  listIssuedParentReportsAction,
  revokeParentReportAction,
  type IssuedParentReport,
} from "@/lib/actions/parent-reports";
import type { AdminStudentRow, ClassOption } from "@/lib/types/admin";
import { downloadReportPathAsPdf } from "@/lib/utils/download-report-pdf";

type Props = {
  students: AdminStudentRow[];
  classOptions?: ClassOption[];
  scopeLabel?: string;
};

type ResultItem = {
  id?: string;
  studentId: string;
  studentName: string;
  path?: string;
  error?: string;
};

type PeriodMode = "7" | "30" | "custom";
type PanelTab = "create" | "issued";

function absoluteUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

export function BulkParentReportsPanel({
  students,
  classOptions = [],
  scopeLabel = "학생",
}: Props) {
  const [tab, setTab] = useState<PanelTab>("create");
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("7");
  const [customDays, setCustomDays] = useState(14);
  const [selected, setSelected] = useState<string[]>([]);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [issued, setIssued] = useState<IssuedParentReport[]>([]);
  const [issuedTotal, setIssuedTotal] = useState(0);
  const [issuedQuery, setIssuedQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [preview, setPreview] = useState<{
    studentName: string;
    path: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const periodDays =
    periodMode === "custom"
      ? Math.min(365, Math.max(1, customDays || 1))
      : Number(periodMode);

  const gradeOptions = useMemo(() => {
    const labels = new Set(
      students.map((s) => s.gradeLabel).filter((l): l is string => Boolean(l)),
    );
    for (const option of classOptions) {
      if (option.gradeLabel) labels.add(option.gradeLabel);
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "ko"));
  }, [students, classOptions]);

  const classNameOptions = useMemo(() => {
    const names = new Set<string>();
    if (classOptions.length > 0) {
      for (const option of classOptions) {
        if (gradeFilter !== "all" && option.gradeLabel !== gradeFilter) continue;
        names.add(option.displayLabel);
      }
    } else {
      for (const student of students) {
        if (gradeFilter !== "all" && student.gradeLabel !== gradeFilter) continue;
        for (const name of student.classNames) names.add(name);
        if (student.className && student.classNames.length === 0) {
          names.add(student.className);
        }
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ko"));
  }, [students, classOptions, gradeFilter]);

  useEffect(() => {
    if (classFilter !== "all" && !classNameOptions.includes(classFilter)) {
      setClassFilter("all");
    }
  }, [classFilter, classNameOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter !== "all" && s.gradeLabel !== gradeFilter) return false;
      if (classFilter !== "all") {
        const inClass =
          s.classNames.includes(classFilter) || s.className === classFilter;
        if (!inClass) return false;
      }
      if (!q) return true;
      return [
        s.displayName,
        s.username,
        s.gradeLabel ?? "",
        s.className ?? "",
        ...s.classNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, query, gradeFilter, classFilter]);

  const selectedInView = selected.filter((id) =>
    filtered.some((s) => s.id === id),
  );

  async function refreshIssued(search = issuedQuery) {
    const result = await listIssuedParentReportsAction({ query: search });
    if (result.reports) {
      setIssued(result.reports);
      if (!search.trim()) setIssuedTotal(result.reports.length);
    }
    if (result.error) setMessage(result.error);
  }

  useEffect(() => {
    void refreshIssued("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "issued") return;
    void refreshIssued(issuedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, issuedQuery]);

  function toggleAll(checked: boolean) {
    if (!checked) {
      const visible = new Set(filtered.map((s) => s.id));
      setSelected((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelected((prev) =>
      Array.from(new Set([...prev, ...filtered.map((s) => s.id)])),
    );
  }

  async function createBulk() {
    if (running || selected.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setMessage(null);
    setItems([]);
    setProgress({ done: 0, total: selected.length });

    const results: ResultItem[] = [];
    for (let i = 0; i < selected.length; i++) {
      if (cancelRef.current) break;
      const studentId = selected[i]!;
      const student = students.find((s) => s.id === studentId);
      const studentName = student?.displayName ?? studentId;
      try {
        const result = await createParentReportAction({
          studentId,
          periodDays,
        });
        if (result.error || !result.path) {
          results.push({
            studentId,
            studentName,
            error: result.error ?? "생성 실패",
          });
        } else {
          results.push({ studentId, studentName, path: result.path });
        }
      } catch {
        results.push({ studentId, studentName, error: "생성 실패" });
      }
      setItems([...results]);
      setProgress({ done: i + 1, total: selected.length });
    }

    const ok = results.filter((r) => r.path).length;
    setMessage(
      cancelRef.current
        ? `중지됨 · ${ok}명까지 만들었습니다.`
        : `${ok}명 보고서 링크를 만들었습니다.`,
    );
    setRunning(false);
    setTab("issued");
    setSelected([]);
    await refreshIssued("");
  }

  async function revokeOne(reportId: string) {
    if (!reportId || revokingId) return;
    if (!window.confirm("이 보고서를 삭제할까요? 링크도 더 이상 열리지 않습니다.")) {
      return;
    }
    setRevokingId(reportId);
    setMessage(null);
    try {
      const result = await revokeParentReportAction(reportId);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(result.success ?? "보고서를 삭제했습니다.");
        await refreshIssued(issuedQuery);
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function copyLink(path: string) {
    const url = absoluteUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했습니다.");
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", url);
    }
  }

  async function saveOnePdf(path: string, studentName: string) {
    try {
      setMessage("PDF 만드는 중…");
      await downloadReportPathAsPdf(path, `${studentName}-학습보고서`);
      setMessage("PDF 다운로드를 시작했습니다.");
    } catch {
      setMessage("PDF 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function saveAllPdf(list: Array<{ path: string; studentName: string }>) {
    if (list.length === 0) return;
    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      setMessage(`PDF 저장 중… (${i + 1}/${list.length})`);
      try {
        await downloadReportPathAsPdf(item.path, `${item.studentName}-학습보고서`);
      } catch {
        // 다음 파일 계속
      }
      await new Promise((r) => window.setTimeout(r, 400));
    }
    setMessage("전체 PDF 다운로드를 마쳤습니다.");
  }

  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <section className="rm-glass rm-glass--compact">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="rm-label">학부모 안심 보고서 일괄 발급</p>
          <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
            {scopeLabel} 보고서를 만들고 PDF로 저장하세요.
          </p>
        </div>
        <div className="flex rounded-xl border border-[var(--rm-border)] p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`rounded-lg px-2.5 py-1.5 ${
              tab === "create"
                ? "bg-[var(--rm-brand)] text-white"
                : "text-[var(--rm-text-muted)]"
            }`}
          >
            새로 만들기
          </button>
          <button
            type="button"
            onClick={() => setTab("issued")}
            className={`rounded-lg px-2.5 py-1.5 ${
              tab === "issued"
                ? "bg-[var(--rm-brand)] text-white"
                : "text-[var(--rm-text-muted)]"
            }`}
          >
            발급된 보고서 ({issuedTotal})
          </button>
        </div>
      </div>

      {tab === "create" ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <select
              value={periodMode}
              onChange={(event) =>
                setPeriodMode(event.target.value as PeriodMode)
              }
              className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--rm-text)]"
            >
              <option value="7">주간 (7일)</option>
              <option value="30">월간 (30일)</option>
              <option value="custom">사용자 설정</option>
            </select>
            {periodMode === "custom" ? (
              <label className="flex items-center gap-1 text-xs font-semibold text-[var(--rm-text-muted)]">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(event) => setCustomDays(Number(event.target.value))}
                  className="w-16 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-2 py-1.5 text-sm text-[var(--rm-text)]"
                />
                일
              </label>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select
              value={gradeFilter}
              onChange={(event) => {
                setGradeFilter(event.target.value);
                setClassFilter("all");
              }}
              className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm text-[var(--rm-text)]"
            >
              <option value="all">전체 학년</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm text-[var(--rm-text)]"
            >
              <option value="all">
                {gradeFilter === "all" ? "전체 반" : "해당 학년 반"}
              </option>
              {classNameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이름·아이디 검색"
              className="min-w-[12rem] flex-1 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm text-[var(--rm-text)]"
            />
            <button
              type="button"
              disabled={running || selected.length === 0}
              onClick={() => void createBulk()}
              className="rounded-xl bg-[var(--rm-brand)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {running
                ? `만드는 중 ${progress.done}/${progress.total}`
                : `선택 ${selected.length}명 보고서 만들기`}
            </button>
            {running ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm font-semibold text-[var(--rm-text)]"
              >
                중지
              </button>
            ) : null}
          </div>

          <div className="mt-2">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--rm-text-muted)]">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 &&
                  selectedInView.length === filtered.length
                }
                onChange={(event) => toggleAll(event.target.checked)}
              />
              현재 목록 전체 선택 ({filtered.length}명) · 선택 {selected.length}
              명
            </label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] p-1.5">
              {filtered.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-[var(--rm-text-muted)]">
                  검색 결과가 없습니다.
                </p>
              ) : (
                filtered.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--rm-text)] hover:bg-[var(--rm-surface)]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(student.id)}
                      onChange={(event) =>
                        setSelected((prev) =>
                          event.target.checked
                            ? [...prev, student.id]
                            : prev.filter((id) => id !== student.id),
                        )
                      }
                    />
                    <span className="font-medium">{student.displayName}</span>
                    <span className="truncate text-xs text-[var(--rm-text-muted)]">
                      {[
                        student.gradeLabel,
                        student.classNames.join(", ") || student.className,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "반 미배정"}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {running ? (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--rm-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--rm-brand)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--rm-text-muted)]">
                {progress.done}/{progress.total}명 완료 · 끝나면 발급 목록으로
                이동합니다
              </p>
            </div>
          ) : null}

          {items.length > 0 ? (
            <ResultList
              items={items}
              emptyText="결과가 없습니다."
              onCopy={(path) => void copyLink(path)}
              onOpen={(item) =>
                setPreview({ studentName: item.studentName, path: item.path! })
              }
              onPdf={(item) => void saveOnePdf(item.path!, item.studentName)}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="search"
              value={issuedQuery}
              onChange={(event) => setIssuedQuery(event.target.value)}
              placeholder="발급된 보고서 · 학생 이름 검색"
              className="min-w-[12rem] flex-1 rounded-xl border border-[var(--rm-bg-elevated)] bg-[var(--rm-bg-elevated)] px-3 py-2 text-sm text-[var(--rm-text)] border-[var(--rm-border)]"
            />
            {issued.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  void saveAllPdf(
                    issued.map((r) => ({
                      path: r.path,
                      studentName: r.studentName,
                    })),
                  )
                }
                className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm font-semibold text-[var(--rm-text)]"
              >
                검색결과 PDF 저장
              </button>
            ) : null}
          </div>
          <ResultList
            items={issued.map((r) => ({
              id: r.id,
              studentId: r.studentId,
              studentName: r.studentName,
              path: r.path,
            }))}
            emptyText="발급된 보고서가 없거나, 034 마이그레이션 이후 생성된 보고서만 검색됩니다."
            onCopy={(path) => void copyLink(path)}
            onOpen={(item) =>
              setPreview({ studentName: item.studentName, path: item.path! })
            }
            onPdf={(item) => void saveOnePdf(item.path!, item.studentName)}
            onDelete={
              revokingId
                ? undefined
                : (item) => {
                    if (item.id) void revokeOne(item.id);
                  }
            }
            deletingId={revokingId}
          />
        </>
      )}

      {message ? (
        <p className="mt-2 text-xs font-medium text-[var(--rm-text-muted)]">
          {message}
        </p>
      ) : null}

      {preview?.path ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-[var(--rm-shadow-soft)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--rm-border)] px-3 py-2">
              <p className="truncate text-sm font-bold text-[var(--rm-text)]">
                {preview.studentName} 보고서 미리보기
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink(preview.path)}
                  className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--rm-text)]"
                >
                  링크복사
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void saveOnePdf(preview.path, preview.studentName)
                  }
                  className="rounded-lg bg-[var(--rm-brand)] px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  PDF 저장
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--rm-text-muted)]"
                >
                  닫기
                </button>
              </div>
            </div>
            <iframe
              title={`${preview.studentName} 보고서`}
              src={preview.path}
              className="min-h-0 flex-1 w-full bg-white"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ResultList({
  items,
  emptyText = "결과가 없습니다.",
  onCopy,
  onOpen,
  onPdf,
  onDelete,
  deletingId,
}: {
  items: ResultItem[];
  emptyText?: string;
  onCopy: (path: string) => void;
  onOpen: (item: ResultItem & { path: string }) => void;
  onPdf: (item: ResultItem & { path: string }) => void;
  onDelete?: (item: ResultItem) => void;
  deletingId?: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-[var(--rm-border)] px-3 py-4 text-center text-xs text-[var(--rm-text-muted)]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
      {items.map((item) => (
        <li
          key={item.id ?? `${item.studentId}-${item.path ?? item.error ?? ""}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--rm-border)] px-2 py-1.5"
        >
          <span className="font-medium text-[var(--rm-text)]">
            {item.studentName}
          </span>
          {item.path ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onCopy(item.path!)}
                className="font-semibold text-[var(--rm-text-muted)] hover:text-[var(--rm-nav-active)]"
              >
                링크복사
              </button>
              <button
                type="button"
                onClick={() => onOpen(item as ResultItem & { path: string })}
                className="font-semibold text-[var(--rm-nav-active)]"
              >
                열기
              </button>
              <button
                type="button"
                onClick={() => onPdf(item as ResultItem & { path: string })}
                className="font-semibold text-[var(--rm-text-muted)] hover:text-[var(--rm-nav-active)]"
              >
                PDF 저장
              </button>
              {onDelete && item.id ? (
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() => onDelete(item)}
                  className="font-semibold text-[var(--rm-danger)] disabled:opacity-50"
                >
                  {deletingId === item.id ? "삭제 중…" : "삭제"}
                </button>
              ) : null}
            </div>
          ) : (
            <span className="text-[var(--rm-danger)]">
              {item.error ?? "실패"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
