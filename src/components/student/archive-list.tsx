"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deleteQuestionsBulkAction } from "@/lib/actions/questions";
import { QuestionArchiveCard } from "@/components/student/question-archive-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteQuestionsBulk,
  getAllQuestions,
  type StoredQuestion,
} from "@/lib/data/questions";
import { useSubjects } from "@/components/student/subject-provider";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { matchesSearchQuery } from "@/lib/utils/search-text";

type Props = {
  userId: string;
};

type SubjectFilter = "all" | string;
type StatusFilter = "all" | "active" | "archived";

import { UI_LABELS } from "@/lib/constants/ui-labels";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "active", label: UI_LABELS.archiveTabActive },
  { id: "archived", label: UI_LABELS.archiveTabSaved },
];

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === "active" || value === "archived") return value;
  return "all";
}

function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isArchivedQuestion(question: StoredQuestion): boolean {
  return Boolean(question.archived) || question.phase === "completed";
}

/** 문제 관련: 문제 키워드 · 출처 · 과목명 */
function buildProblemKeywordHaystack(
  question: StoredQuestion,
  resolveSubjectName: (id: string) => string,
): string {
  return [
    resolveSubjectName(question.subjectId),
    ...(question.keywords ?? []),
    question.source ?? "",
  ].join(" ");
}

function getQuestionWrongKeywords(question: StoredQuestion): string[] {
  if (question.wrongKeywords?.length) {
    return question.wrongKeywords.map((k) => k.trim()).filter(Boolean);
  }
  return (question.wrongReasonDetail ?? "")
    .split(/[,，#\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function ArchiveList({ userId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subjects, getSubjectName } = useSubjects();
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [problemQuery, setProblemQuery] = useState("");
  const [selectedWrongReasons, setSelectedWrongReasons] = useState<string[]>(
    [],
  );
  const [selectedWrongKeywords, setSelectedWrongKeywords] = useState<string[]>(
    [],
  );
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get("status")),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  useEffect(() => {
    setStatusFilter(parseStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    void getAllQuestions(userId).then(setQuestions);
  }, [userId]);

  const counts = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const q of questions) {
      if (isArchivedQuestion(q)) archived += 1;
      else active += 1;
    }
    return { all: questions.length, active, archived };
  }, [questions]);

  function changeStatusFilter(next: StatusFilter) {
    setStatusFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `/archive?${qs}` : "/archive", { scroll: false });
  }

  /** 등록된 문제에 실제로 있는 틀린 이유 목록 */
  const wrongReasonOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) {
      const reason = q.wrongReason?.trim();
      if (!reason) continue;
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .map(([label, count]) => ({ label, count }));
  }, [questions]);

  /** 선택한 틀린 이유별 오답 키워드 (키워드 없는 이유는 제외) */
  const wrongKeywordGroups = useMemo(() => {
    if (selectedWrongReasons.length === 0) return [];

    return selectedWrongReasons
      .map((reason) => {
        const counts = new Map<string, number>();
        for (const q of questions) {
          if (q.wrongReason?.trim() !== reason) continue;
          for (const keyword of getQuestionWrongKeywords(q)) {
            counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
          }
        }
        const options = [...counts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
          .map(([label, count]) => ({ label, count }));
        return { reason, options };
      })
      .filter((group) => group.options.length > 0);
  }, [questions, selectedWrongReasons]);

  useEffect(() => {
    if (selectedWrongReasons.length === 0) {
      setSelectedWrongKeywords((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const allowed = new Set(
      wrongKeywordGroups.flatMap((group) => group.options.map((o) => o.label)),
    );
    setSelectedWrongKeywords((prev) => {
      const next = prev.filter((k) => allowed.has(k));
      if (
        next.length === prev.length &&
        next.every((value, index) => value === prev[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [selectedWrongReasons, wrongKeywordGroups]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (subjectFilter !== "all" && q.subjectId !== subjectFilter) {
        return false;
      }

      const archived = isArchivedQuestion(q);
      if (statusFilter === "archived" && !archived) return false;
      if (statusFilter === "active" && archived) return false;

      const createdKey = toDateKey(q.createdAt);
      if (dateFrom && createdKey < dateFrom) return false;
      if (dateTo && createdKey > dateTo) return false;

      if (
        !matchesSearchQuery(
          buildProblemKeywordHaystack(q, getSubjectName),
          problemQuery,
        )
      ) {
        return false;
      }

      if (selectedWrongReasons.length > 0) {
        const reason = q.wrongReason?.trim() ?? "";
        if (!selectedWrongReasons.includes(reason)) return false;
      }

      if (selectedWrongKeywords.length > 0) {
        const keywords = getQuestionWrongKeywords(q).map((k) => k.toLowerCase());
        const hit = selectedWrongKeywords.some((selected) =>
          keywords.includes(selected.toLowerCase()),
        );
        if (!hit) return false;
      }

      return true;
    });
  }, [
    questions,
    problemQuery,
    selectedWrongReasons,
    selectedWrongKeywords,
    subjectFilter,
    statusFilter,
    dateFrom,
    dateTo,
    getSubjectName,
  ]);

  const hasDetailFilters =
    subjectFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(problemQuery.trim()) ||
    selectedWrongReasons.length > 0 ||
    selectedWrongKeywords.length > 0;

  function clearDetailFilters() {
    setProblemQuery("");
    setSelectedWrongReasons([]);
    setSelectedWrongKeywords([]);
    setSubjectFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const bulkDeleteDescription = useMemo(() => {
    const parts: string[] = [
      `지금 화면에 보이는 ${filtered.length}개 문제를 모두 삭제합니다.`,
      "",
      "사진, 해설, 오답 메모가 전부 지워지고 되돌릴 수 없어요.",
    ];
    if (hasDetailFilters) {
      parts.push("", "※ 필터·검색으로 좁힌 목록만 삭제됩니다.");
    }
    if (statusFilter === "archived") {
      parts.push("※ 「보관함에 저장」된 문제만 대상입니다.");
    } else if (statusFilter === "active") {
      parts.push("※ 「복습 중」인 문제만 대상입니다.");
    }
    return parts.join("\n");
  }, [filtered.length, hasDetailFilters, statusFilter]);

  async function handleBulkDeleteConfirm() {
    const ids = filtered.map((q) => q.id);
    setBulkDeleting(true);
    try {
      if (isSupabaseEnabled()) {
        const result = await deleteQuestionsBulkAction(ids);
        if (result.error) {
          window.alert(result.error);
          return;
        }
      } else {
        await deleteQuestionsBulk(userId, ids);
      }
      const idSet = new Set(ids);
      setQuestions((prev) => prev.filter((q) => !idSet.has(q.id)));
      setShowBulkDeleteConfirm(false);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title={`${filtered.length}개 문제를 모두 삭제할까요?`}
        description={bulkDeleteDescription}
        confirmLabel="전부 삭제"
        cancelLabel="취소"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={() => void handleBulkDeleteConfirm()}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeStatusFilter(tab.id)}
              className={`rounded-xl px-2 py-2.5 text-center text-xs font-semibold transition touch-manipulation sm:text-sm ${
                active
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                {count}개
              </span>
            </button>
          );
        })}
      </div>

      {statusFilter === "archived" ? (
        <p className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          복습을 끝내고 「보관함 저장」한 문제만 모아 둔 곳이에요.
        </p>
      ) : null}

      <div className="remind-filter-panel space-y-4">
        <div>
          <p className="remind-section-title">검색 · 상세 필터</p>
          <p className="mt-1 text-xs text-slate-500">
            틀린 이유는 여러 개 고를 수 있고, 고른 이유마다 아래 오답 키워드가
            나와요.
          </p>
        </div>

        <label className="block">
          <span className="remind-field-label">문제 키워드</span>
          <input
            type="search"
            value={problemQuery}
            onChange={(event) => setProblemQuery(event.target.value)}
            placeholder="예: 이차함수, 모평22번"
            className="remind-input mt-1"
          />
        </label>

        <div className="space-y-2">
          <p className="remind-field-label">틀린 이유 (여러 개 선택 가능)</p>
          {wrongReasonOptions.length === 0 ? (
            <p className="text-xs text-slate-400">
              아직 틀린 이유를 적은 문제가 없어요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {wrongReasonOptions.map((option) => {
                const active = selectedWrongReasons.includes(option.label);
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      setSelectedWrongReasons((prev) =>
                        toggleInList(prev, option.label),
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {option.label}
                    <span className="ml-1 text-[10px] opacity-60">
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {wrongKeywordGroups.length > 0 ? (
          <div className="space-y-3">
            {wrongKeywordGroups.map((group) => (
              <div
                key={group.reason}
                className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/40 p-3"
              >
                <p className="remind-field-label">
                  오답 키워드
                  <span className="ml-1 font-normal text-slate-500">
                    · {group.reason}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => {
                    const active = selectedWrongKeywords.includes(option.label);
                    return (
                      <button
                        key={`${group.reason}-${option.label}`}
                        type="button"
                        onClick={() =>
                          setSelectedWrongKeywords((prev) =>
                            toggleInList(prev, option.label),
                          )
                        }
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        #{option.label}
                        <span className="ml-1 text-[10px] opacity-60">
                          {option.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <label className="block">
          <span className="remind-field-label">과목</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value as SubjectFilter)}
            className="remind-input mt-1"
          >
            <option value="all">전체 과목</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="remind-field-label">시작일 (선택)</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="remind-input mt-1"
            />
          </label>
          <label className="block">
            <span className="remind-field-label">종료일 (선택)</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="remind-input mt-1"
            />
          </label>
        </div>

        {hasDetailFilters ? (
          <button type="button" onClick={clearDetailFilters} className="remind-link-btn">
            검색 · 필터 초기화
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{filtered.length}건</span>
        {hasDetailFilters ? " · 검색/필터 적용" : null}
      </p>

      {filtered.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowBulkDeleteConfirm(true)}
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 touch-manipulation hover:bg-red-100"
        >
          지금 목록 {filtered.length}개 전부 삭제
        </button>
      ) : null}

      {filtered.length === 0 ? (
        <div className="remind-empty-state mt-6">
          {statusFilter === "archived"
            ? hasDetailFilters
              ? "조건에 맞는 보관 문제가 없습니다."
              : "아직 보관한 문제가 없어요. 복습을 끝낸 뒤 「보관함 저장」을 누르면 여기에 쌓여요."
            : hasDetailFilters
              ? "조건에 맞는 문제가 없습니다. 키워드·필터를 바꿔 보세요."
              : "등록된 문제가 없습니다. 문제 등록 탭에서 올려 주세요."}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((question) => (
            <QuestionArchiveCard
              key={question.id}
              question={question}
              userId={userId}
              subjectName={getSubjectName(question.subjectId)}
              archived={isArchivedQuestion(question)}
              onDelete={(id) =>
                setQuestions((prev) => prev.filter((q) => q.id !== id))
              }
              onUpdate={(updated) =>
                setQuestions((prev) =>
                  prev.map((q) => (q.id === updated.id ? updated : q)),
                )
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
