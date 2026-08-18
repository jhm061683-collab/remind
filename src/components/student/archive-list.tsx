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

import {
  EmptyState,
  ErrorState,
  FilterEmptyState,
  ListSkeleton,
} from "@/components/ui/status-state";
import {
  categorizeWrongReason,
  SYSTEM_WRONG_REASON_CATEGORIES,
} from "@/lib/archive/wrong-reason-category";
import {
  parseArchiveFilters,
  parseArchivePage,
} from "@/lib/archive/list-query";
import { UI_LABELS } from "@/lib/constants/ui-labels";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "active", label: UI_LABELS.archiveTabActive },
  { id: "archived", label: UI_LABELS.archiveTabSaved },
];

const PAGE_SIZE = 20;

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
  const archiveFilters = parseArchiveFilters(searchParams);
  const problemQuery = archiveFilters.q;
  const selectedWrongReasons = archiveFilters.reasons;
  const selectedWrongKeywords = archiveFilters.wrongKeywords;
  const subjectFilter = archiveFilters.subject as SubjectFilter;
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const dateFrom = archiveFilters.from;
  const dateTo = archiveFilters.to;
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(() =>
    ["q", "subject", "from", "to", "reason", "wrongKeyword"].some((key) =>
      searchParams.has(key),
    ),
  );

  function replaceFilter(
    key: "q" | "subject" | "from" | "to" | "reason" | "wrongKeyword",
    value: string | string[],
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item && item !== "all") params.append(key, item);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/archive?${qs}` : "/archive", { scroll: false });
  }

  const loadQuestions = () => {
    setLoadState((prev) => (prev === "ready" ? "ready" : "loading"));
    setLoadError(null);
    void getAllQuestions(userId)
      .then((rows) => {
        setQuestions(rows);
        setLoadState("ready");
        setLoadError(null);
      })
      .catch(() => {
        setLoadError(
          "문제를 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.",
        );
        setLoadState("error");
      });
  };

  useEffect(() => {
    let cancelled = false;
    void getAllQuestions(userId)
      .then((rows) => {
        if (cancelled) return;
        setQuestions(rows);
        setLoadState("ready");
        setLoadError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(
          "문제를 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.",
        );
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
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
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `/archive?${qs}` : "/archive", { scroll: false });
  }

  /** 필터에는 학생 원문이 아니라 중립 분류만 올린다. */
  const wrongReasonOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of SYSTEM_WRONG_REASON_CATEGORIES)
      counts.set(category, 0);
    for (const q of questions) {
      const category = categorizeWrongReason(q.wrongReason);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return SYSTEM_WRONG_REASON_CATEGORIES.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    }));
  }, [questions]);

  /** 선택한 틀린 이유별 오답 키워드 (키워드 없는 이유는 제외) */
  const wrongKeywordGroups = useMemo(() => {
    if (selectedWrongReasons.length === 0) return [];

    return selectedWrongReasons
      .map((reason) => {
        const counts = new Map<string, number>();
        for (const q of questions) {
          if (categorizeWrongReason(q.wrongReason) !== reason) continue;
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

  const allowedWrongKeywords = useMemo(() => {
    if (selectedWrongReasons.length === 0) return new Set<string>();
    return new Set(
      wrongKeywordGroups.flatMap((group) => group.options.map((o) => o.label)),
    );
  }, [selectedWrongReasons, wrongKeywordGroups]);

  const activeWrongKeywords = useMemo(
    () =>
      selectedWrongKeywords.filter((keyword) =>
        allowedWrongKeywords.has(keyword),
      ),
    [selectedWrongKeywords, allowedWrongKeywords],
  );

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
        const category = categorizeWrongReason(q.wrongReason);
        if (!selectedWrongReasons.includes(category)) return false;
      }

      if (activeWrongKeywords.length > 0) {
        const keywords = getQuestionWrongKeywords(q).map((k) =>
          k.toLowerCase(),
        );
        const hit = activeWrongKeywords.some((selected) =>
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
    activeWrongKeywords,
    subjectFilter,
    statusFilter,
    dateFrom,
    dateTo,
    getSubjectName,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = parseArchivePage(searchParams.get("page"), pageCount);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `/archive?${qs}` : "/archive", { scroll: false });
  }

  const hasDetailFilters =
    subjectFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(problemQuery.trim()) ||
    selectedWrongReasons.length > 0 ||
    activeWrongKeywords.length > 0;

  function clearDetailFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [
      "q",
      "subject",
      "from",
      "to",
      "reason",
      "wrongKeyword",
      "page",
    ]) {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `/archive?${qs}` : "/archive", { scroll: false });
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
      parts.push("※ 「보관 완료」된 문제만 대상입니다.");
    } else if (statusFilter === "active") {
      parts.push("※ 「다시 푸는 중」인 문제만 대상입니다.");
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
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--rm-accent-muted)] p-1">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeStatusFilter(tab.id)}
              className={`min-h-[44px] rounded-xl px-2 py-2.5 text-center text-xs font-semibold transition touch-manipulation sm:text-sm ${
                active
                  ? "bg-[var(--rm-surface)] text-[var(--rm-text-on-info)] shadow-sm"
                  : "text-[var(--rm-text-muted)] hover:text-[var(--rm-text)]"
              }`}
            >
              {tab.label}
              <span className="mt-0.5 block text-[11px] font-medium text-[var(--rm-text-faint)]">
                {loadState === "ready" ? `${count}개` : "…"}
              </span>
            </button>
          );
        })}
      </div>

      {statusFilter === "archived" ? (
        <p className="mb-4 rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-4 py-3 text-sm text-[var(--rm-text-on-info)]">
          다시 풀기를 끝내고 「보관 완료」로 저장한 문제만 모아 둔 곳이에요.
        </p>
      ) : statusFilter === "active" ? (
        <p className="mb-4 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-4 py-3 text-sm text-[var(--rm-text-muted)]">
          아직 다시 푸는 중인 문제예요. 오늘 할 일은 「다시 풀기」 탭에서도 볼
          수 있어요.
        </p>
      ) : null}

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--rm-text)]"
        >
          <span>
            검색 · 필터
            {hasDetailFilters ? (
              <span className="ml-1.5 text-[11px] font-medium text-[var(--rm-nav-active)]">
                적용 중
              </span>
            ) : null}
          </span>
          <span className="text-xs text-[var(--rm-text-muted)]">
            {filtersOpen ? "접기" : "펼치기"}
          </span>
        </button>
      </div>

      {filtersOpen ? (
        <div className="remind-filter-panel space-y-4">
          <div>
            <p className="remind-section-title">검색 · 상세 필터</p>
            <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
              과목·출처·키워드·틀린 이유로 찾을 수 있어요.
            </p>
          </div>

          <label className="block">
            <span className="remind-field-label">검색 (과목·출처·키워드)</span>
            <input
              type="search"
              value={problemQuery}
              onChange={(event) => replaceFilter("q", event.target.value)}
              placeholder="예: 이차함수, 모평22번"
              className="remind-input mt-1"
            />
          </label>

          <div className="space-y-2">
            <p className="remind-field-label">틀린 이유 (시스템 분류)</p>
            {wrongReasonOptions.length === 0 ? (
              <p className="text-xs text-[var(--rm-text-faint)]">
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
                      onClick={() => {
                        const next = toggleInList(
                          selectedWrongReasons,
                          option.label,
                        );
                        replaceFilter("reason", next);
                      }}
                      className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-rose-300 bg-rose-50 text-rose-800"
                          : "border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
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

          {selectedWrongReasons.length > 0 ? (
            <p className="text-xs text-[var(--rm-text-muted)]">
              학생이 직접 적은 오답 메모는 문제 상세에서만 보여 줍니다. 필터에는
              올리지 않습니다.
            </p>
          ) : null}

          <label className="block">
            <span className="remind-field-label">과목</span>
            <select
              value={subjectFilter}
              onChange={(e) => replaceFilter("subject", e.target.value)}
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
                onChange={(e) => replaceFilter("from", e.target.value)}
                className="remind-input mt-1"
              />
            </label>
            <label className="block">
              <span className="remind-field-label">종료일 (선택)</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => replaceFilter("to", e.target.value)}
                className="remind-input mt-1"
              />
            </label>
          </div>

          {hasDetailFilters ? (
            <button
              type="button"
              onClick={clearDetailFilters}
              className="remind-link-btn"
            >
              검색 · 필터 초기화
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-[var(--rm-text-muted)]">
        {loadState === "ready" ? (
          <>
            <span className="font-semibold text-[var(--rm-text)]">
              {filtered.length}건
            </span>
            {hasDetailFilters ? " · 검색/필터 적용" : null}
          </>
        ) : loadState === "loading" ? (
          "문제를 불러오는 중"
        ) : (
          "불러오지 못했습니다"
        )}
      </p>

      {loadState === "loading" && questions.length === 0 ? (
        <div className="mt-3">
          <ListSkeleton rows={5} />
        </div>
      ) : loadState === "error" && questions.length === 0 ? (
        <div className="mt-3">
          <ErrorState
            message={loadError ?? "문제를 불러오지 못했습니다."}
            onRetry={loadQuestions}
          />
        </div>
      ) : filtered.length === 0 ? (
        hasDetailFilters ? (
          <FilterEmptyState
            summary="지금 켜 둔 검색·필터에 맞는 문제가 없습니다."
            onReset={clearDetailFilters}
          />
        ) : (
          <EmptyState
            title={
              statusFilter === "archived"
                ? "아직 보관한 문제가 없어요"
                : "등록된 문제가 없습니다"
            }
            description={
              statusFilter === "archived"
                ? "다시 풀기를 끝낸 뒤 「보관 완료」를 누르면 여기에 쌓여요."
                : "「등록」 탭에서 오답을 올려 주세요."
            }
            actionHref={statusFilter === "archived" ? undefined : "/upload"}
            actionLabel={statusFilter === "archived" ? undefined : "오답 등록"}
          />
        )
      ) : (
        <ul className="mt-3 space-y-2.5">
          {paged.map((question) => (
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
      {filtered.length > PAGE_SIZE ? (
        <div className="mt-4 mb-2 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            className="min-h-[44px] rounded-xl border border-[var(--rm-border)] px-3 text-sm font-semibold disabled:opacity-40"
          >
            이전
          </button>
          <p className="text-sm text-[var(--rm-text-muted)]">
            {page} / {pageCount}쪽
          </p>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goPage(page + 1)}
            className="min-h-[44px] rounded-xl border border-[var(--rm-border)] px-3 text-sm font-semibold disabled:opacity-40"
          >
            다음
          </button>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="mt-6 border-t border-[var(--rm-border)] pt-4">
          <button
            type="button"
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] py-2.5 text-xs font-semibold text-[var(--rm-text-muted)] touch-manipulation hover:border-[var(--rm-error-border)] hover:text-[var(--rm-danger)]"
          >
            지금 목록 {filtered.length}개 삭제…
          </button>
        </div>
      ) : null}
    </>
  );
}
