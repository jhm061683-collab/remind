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

function buildSearchHaystack(
  question: StoredQuestion,
  resolveSubjectName: (id: string) => string,
): string {
  return [
    resolveSubjectName(question.subjectId),
    ...(question.keywords ?? []),
    question.answerText ?? "",
    question.source ?? "",
    question.wrongReason ?? "",
    question.wrongReasonDetail ?? "",
    question.reflectionMemo ?? "",
  ].join(" ");
}

export function ArchiveList({ userId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subjects, getSubjectName } = useSubjects();
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [query, setQuery] = useState("");
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

      return matchesSearchQuery(buildSearchHaystack(q, getSubjectName), query);
    });
  }, [questions, query, subjectFilter, statusFilter, dateFrom, dateTo, getSubjectName]);

  const hasDetailFilters =
    subjectFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(query.trim());

  function clearDetailFilters() {
    setQuery("");
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
            키워드·과목·날짜로 더 좁혀 볼 수 있어요.
          </p>
        </div>

        <label className="block">
          <span className="remind-field-label">키워드</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 발문 오독, 이차함수, 빈칸추론"
            className="remind-input mt-1"
          />
        </label>

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
