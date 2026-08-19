"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  deleteQuestionAction,
  updateProblemLatexAction,
  updateReflectionAction,
} from "@/lib/actions/questions";
import { ocrFromImageAction } from "@/lib/actions/ocr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionImages } from "@/components/student/question-images";
import { LatexContent } from "@/components/math/latex-content";
import { MathAnswerView } from "@/components/math/math-answer-view";
import { MathAwareTextarea } from "@/components/math/math-symbol-panel";
import { LatexLightbox } from "@/components/math/latex-lightbox";
import { KeywordPicker } from "@/components/student/keyword-picker";
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
import { recordKeywordUsage } from "@/lib/data/keyword-library";
import {
  deleteQuestion,
  updateQuestion,
  type StoredQuestion,
} from "@/lib/data/questions";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { categorizeWrongReason } from "@/lib/archive/wrong-reason-category";
import { formatDate } from "@/lib/utils/labels";
import {
  getAnswerImageUrls,
  getQuestionImageUrls,
} from "@/lib/utils/question-images";
import {
  cropExtractedFigures,
  embedProblemFigures,
} from "@/lib/utils/problem-figures";
import { uploadDataUrl } from "@/lib/db/images";

type Props = {
  question: StoredQuestion;
  userId: string;
  subjectName: string;
  archived: boolean;
  position?: number;
  onDelete: (id: string) => void;
  onUpdate: (question: StoredQuestion) => void;
};

function storedWrongKeywords(question: StoredQuestion): string[] {
  if (question.wrongKeywords?.length) return question.wrongKeywords;
  return (question.wrongReasonDetail ?? "")
    .split(/[,，#\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function QuestionArchiveCard({
  question,
  userId,
  subjectName,
  archived,
  position,
  onDelete,
  onUpdate,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(question.source ?? "");
  const [keywords, setKeywords] = useState<string[]>(question.keywords ?? []);
  const [wrongReason, setWrongReason] = useState(question.wrongReason ?? "");
  const [wrongKeywords, setWrongKeywords] = useState<string[]>(
    storedWrongKeywords(question),
  );
  const [reflectionMemo, setReflectionMemo] = useState(
    question.reflectionMemo ?? "",
  );
  const [problemLatexDraft, setProblemLatexDraft] = useState(
    question.problemLatex ?? "",
  );
  const [editingLatex, setEditingLatex] = useState(false);
  const [showProblemSection, setShowProblemSection] = useState(false);
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latexZoomOpen, setLatexZoomOpen] = useState(false);
  const [aiCandidate, setAiCandidate] = useState<string | null>(null);
  const [aiCandidateKeywords, setAiCandidateKeywords] = useState<string[]>([]);
  const [aiPending, startAi] = useTransition();

  const answerImageUrls = getAnswerImageUrls(question);
  const hasAnswer = Boolean(question.answerText || answerImageUrls.length > 0);
  const hasReflection = Boolean(
    question.reflectionMemo ||
    question.wrongReason ||
    (question.wrongKeywords && question.wrongKeywords.length > 0) ||
    question.wrongReasonDetail ||
    question.source,
  );
  const displayLatex = question.problemLatex ?? "";
  const hasUnsavedChanges =
    source !== (question.source ?? "") ||
    problemLatexDraft !== (question.problemLatex ?? "") ||
    wrongReason !== (question.wrongReason ?? "") ||
    reflectionMemo !== (question.reflectionMemo ?? "") ||
    JSON.stringify(keywords) !== JSON.stringify(question.keywords ?? []) ||
    JSON.stringify(wrongKeywords) !==
      JSON.stringify(storedWrongKeywords(question));

  useEffect(() => {
    if (!(editing || editingLatex) || !hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, editingLatex, hasUnsavedChanges]);

  function resetDrafts() {
    setSource(question.source ?? "");
    setKeywords(question.keywords ?? []);
    setWrongReason(question.wrongReason ?? "");
    setWrongKeywords(storedWrongKeywords(question));
    setReflectionMemo(question.reflectionMemo ?? "");
    setProblemLatexDraft(question.problemLatex ?? "");
    setEditing(false);
    setEditingLatex(false);
  }

  function beginDirectEdit() {
    setExpanded(true);
    setShowProblemSection(true);
    setEditing(true);
    setEditingLatex(true);
    setMessage("AI 호출 없이 저장된 내용을 직접 수정합니다.");
  }

  async function handleSaveReflection() {
    setSaving(true);
    setMessage(null);
    try {
      const patch = {
        source: source.trim() || undefined,
        keywords,
        wrongReason: wrongReason || undefined,
        wrongKeywords,
        wrongReasonDetail:
          wrongKeywords.length > 0 ? wrongKeywords.join(", ") : undefined,
        reflectionMemo: reflectionMemo.trim() || undefined,
      };

      if (isSupabaseEnabled()) {
        const result = await updateReflectionAction({
          questionId: question.id,
          ...patch,
        });
        if (result.error) {
          setMessage(result.error);
          return;
        }
        if (result.question) onUpdate(result.question);
      } else {
        const updated = await updateQuestion(userId, question.id, patch);
        if (updated) onUpdate(updated);
      }
      if (keywords.length > 0)
        void recordKeywordUsage(userId, "problem", keywords);
      if (wrongKeywords.length > 0) {
        void recordKeywordUsage(userId, "wrong", wrongKeywords);
      }
      setEditing(false);
      setMessage("저장했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLatex() {
    setSaving(true);
    setMessage(null);
    try {
      const latex = problemLatexDraft.trim();
      if (!latex) {
        setMessage("문제 내용을 입력해 주세요.");
        return;
      }

      if (isSupabaseEnabled()) {
        const result = await updateProblemLatexAction({
          questionId: question.id,
          problemLatex: latex,
        });
        if (result.error) {
          setMessage(result.error);
          return;
        }
        if (result.question) {
          onUpdate(result.question);
          setProblemLatexDraft(result.question.problemLatex ?? latex);
        }
      } else {
        const updated = await updateQuestion(userId, question.id, {
          problemLatex: latex,
        });
        if (updated) onUpdate(updated);
      }
      setEditingLatex(false);
      setMessage("문제 문구를 저장했어요.");
    } finally {
      setSaving(false);
    }
  }

  function handleRebuildWithAi() {
    const urls = getQuestionImageUrls(question);
    if (urls.length === 0) {
      setMessage("문제 사진이 없어서 AI로 만들 수 없어요.");
      return;
    }

    setMessage(null);
    setExpanded(true);
    setShowProblemSection(true);
    startAi(async () => {
      const result = await ocrFromImageAction({
        requestId: crypto.randomUUID(),
        imageDataUrl: urls[0]!,
        extraImageDataUrls: urls.slice(1),
        subjectId: question.subjectId,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const rawLatex = result.result?.problemLatex?.trim() ?? "";
      if (!rawLatex) {
        setMessage("AI가 문제를 읽지 못했어요. 사진을 확인해 주세요.");
        return;
      }
      const figureRegions = result.result?.problems?.[0]?.figures ?? [];
      const croppedFigures = await cropExtractedFigures(urls, figureRegions);
      let figureUrls = croppedFigures;
      if (isSupabaseEnabled() && croppedFigures.length > 0) {
        try {
          figureUrls = await Promise.all(
            croppedFigures.map((dataUrl) =>
              uploadDataUrl(dataUrl, userId, "question"),
            ),
          );
        } catch {
          figureUrls = [];
        }
      }
      const latex = embedProblemFigures(rawLatex, figureUrls);

      setAiCandidate(latex);
      setAiCandidateKeywords(result.result?.keywords ?? []);
      setEditingLatex(false);
      setMessage("AI 결과를 기존 값과 비교해 주세요. 아직 저장하지 않았습니다.");
    });
  }

  function applyAiCandidateToDraft() {
    if (!aiCandidate) return;
    setProblemLatexDraft(aiCandidate);
    setKeywords((previous) =>
      Array.from(new Set([...previous, ...aiCandidateKeywords])).slice(0, 12),
    );
    setAiCandidate(null);
    setAiCandidateKeywords([]);
    setEditing(true);
    setEditingLatex(true);
    setMessage("AI 결과를 수정 폼에 불러왔습니다. 확인 후 저장해 주세요.");
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (isSupabaseEnabled()) {
        const result = await deleteQuestionAction(question.id);
        if (result.error) {
          window.alert(result.error);
          return;
        }
      } else {
        await deleteQuestion(userId, question.id);
      }
      setShowDeleteConfirm(false);
      onDelete(question.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="문제를 삭제할까요?"
        description={`「${subjectName}」 문제를 삭제합니다.\n\n사진, 해설, 오답 메모가 모두 지워지고 되돌릴 수 없어요.`}
        confirmLabel="삭제하기"
        cancelLabel="취소"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <li className="remind-card overflow-hidden border-[color-mix(in_srgb,var(--rm-border)_88%,var(--rm-text)_12%)] shadow-[0_8px_24px_color-mix(in_srgb,var(--rm-text)_7%,transparent)] transition-shadow hover:shadow-[0_12px_30px_color-mix(in_srgb,var(--rm-text)_10%,transparent)] focus-within:ring-2 focus-within:ring-[var(--rm-brand)]/35">
        {displayLatex ? (
          <button
            type="button"
            onClick={() => setLatexZoomOpen(true)}
            className="relative block max-h-36 min-h-[72px] w-full overflow-hidden border-b border-[var(--rm-border)] bg-[var(--rm-surface)] text-left"
          >
            <LatexContent
              content={displayLatex}
              className="px-4 py-2.5 text-sm"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--rm-surface)] to-transparent" />
            <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
              <span aria-hidden>🔍</span> 크게 보기
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setShowProblemSection(true);
            }}
            className="relative block h-32 w-full bg-[var(--rm-accent-muted)] text-left"
            aria-label="사진 문제 자세히 보기"
          >
            <QuestionImages
              question={question}
              alt="문제"
              thumbnail
              fill
              imageClassName="object-contain"
            />
            <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
              사진 문제 · 자세히
            </span>
          </button>
        )}

        <div className="p-3.5 text-base">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {position ? (
                  <span className="rounded-md bg-[var(--rm-accent-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--rm-text-muted)]">
                    문제 {position}
                  </span>
                ) : null}
                <span className="rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--rm-text)]">
                  {subjectName}
                </span>
              </div>
              <p className="mt-1 min-w-0 truncate font-semibold text-[var(--rm-text)]">
              {question.source ? (
                  question.source
                ) : "출처 미입력"}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--rm-text-faint)]">
                등록 {formatDate(question.createdAt)}
                {!archived ? ` · 다음 복습 ${formatDate(question.nextReviewDate)}` : " · 복습 완료"}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                archived
                  ? "bg-violet-100 text-[var(--rm-brand-violet)]"
                  : "bg-emerald-100 text-[var(--rm-text-on-success)]"
              }`}
            >
              {archived ? UI_LABELS.statusArchived : UI_LABELS.statusKeeping}
            </span>
          </div>
          {question.wrongReason ? (
            <span className="mt-2 inline-block rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {categorizeWrongReason(question.wrongReason)}
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 min-h-[44px] w-full rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] py-2.5 text-xs font-bold text-[var(--rm-text-on-info)] touch-manipulation"
          >
            {expanded ? "접기 ↑" : "자세히 보기 · 정답·오답 분석 ↓"}
          </button>
        </div>

        {expanded ? (
          <div className="space-y-3 border-t border-[var(--rm-border)] px-3.5 pb-3.5 pt-3">
            {message ? (
              <p className="rounded-lg bg-[var(--rm-success-bg)] px-3 py-2 text-xs text-[var(--rm-text-on-success)]">
                {message}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={beginDirectEdit}
                className="min-h-[44px] rounded-xl bg-[var(--rm-brand)] px-3 text-sm font-bold text-white"
              >
                직접 수정
              </button>
              <button
                type="button"
                disabled={aiPending}
                onClick={handleRebuildWithAi}
                className="min-h-[44px] rounded-xl border border-[var(--rm-border)] px-3 text-sm font-bold text-[var(--rm-text)] disabled:opacity-50"
              >
                {aiPending ? "AI 분석 중…" : "AI로 다시 분석"}
              </button>
              <Link
                href={`/study/today?mode=subject&subject=${encodeURIComponent(question.subjectId)}`}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--rm-border)] px-3 text-sm font-bold text-[var(--rm-nav-active)]"
              >
                다시 풀기
              </Link>
            </div>

            {aiCandidate ? (
              <section className="space-y-3 rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] p-3" aria-label="AI 재분석 결과 비교">
                <div>
                  <p className="text-sm font-bold text-[var(--rm-text-on-info)]">
                    AI 결과 미리보기 · 아직 저장 안 됨
                  </p>
                  <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
                    적용하면 수정 폼에만 들어가며, 저장 버튼을 눌러야 기존 값이 바뀝니다.
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3">
                    <p className="mb-2 text-xs font-bold text-[var(--rm-text-muted)]">현재 저장값</p>
                    {displayLatex ? <LatexContent content={displayLatex} className="text-sm" /> : <p className="text-xs text-[var(--rm-text-faint)]">저장된 문구 없음</p>}
                  </div>
                  <div className="rounded-lg border border-[var(--rm-brand)]/35 bg-[var(--rm-surface)] p-3">
                    <p className="mb-2 text-xs font-bold text-[var(--rm-nav-active)]">새 AI 결과</p>
                    <LatexContent content={aiCandidate} className="text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiCandidate(null);
                      setAiCandidateKeywords([]);
                      setMessage("기존 값을 유지합니다.");
                    }}
                    className="min-h-[44px] flex-1 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] text-sm font-semibold"
                  >
                    기존 값 유지
                  </button>
                  <button
                    type="button"
                    onClick={applyAiCandidateToDraft}
                    className="min-h-[44px] flex-1 rounded-xl bg-[var(--rm-brand)] text-sm font-bold text-white"
                  >
                    수정 폼에 적용
                  </button>
                </div>
              </section>
            ) : null}

            {/* 1) 정답·해설 — 가장 먼저 */}
            <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
              <p className="text-sm font-bold text-[var(--rm-text)]">
                정답 · 해설
              </p>
              {!hasAnswer ? (
                <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
                  등록할 때 넣은 해설이 없어요.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {question.answerText ? (
                    <MathAnswerView
                      content={question.answerText}
                      className="text-base"
                    />
                  ) : null}
                  {answerImageUrls.length > 0 ? (
                    <QuestionImages
                      question={{
                        imageDataUrl: answerImageUrls[0]!,
                        extraImageDataUrls: answerImageUrls.slice(1),
                      }}
                      alt="해설"
                      className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                      imageClassName="max-h-64 w-full object-contain"
                    />
                  ) : null}
                </div>
              )}
            </div>

            {/* 2) 오답 분석 */}
            <div className="rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[var(--rm-text-on-info)]">
                  오답 분석
                </p>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-[var(--rm-text-on-info)]"
                  >
                    {hasReflection ? "수정" : "작성"}
                  </button>
                ) : null}
              </div>

              {editing ? (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[var(--rm-text-muted)]">
                      문제 출처
                    </span>
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="예: 26년 6월 모평 22번"
                      className="remind-input mt-1 text-base"
                    />
                  </label>
                  <KeywordPicker
                    userId={userId}
                    kind="problem"
                    selected={keywords}
                    onChange={setKeywords}
                    label="문제 키워드"
                    hint="★즐겨찾기 · ×삭제"
                    placeholder="예: 이차함수"
                  />
                  <WrongReasonFields
                    userId={userId}
                    wrongReason={wrongReason}
                    wrongKeywords={wrongKeywords}
                    onWrongReasonChange={setWrongReason}
                    onWrongKeywordsChange={setWrongKeywords}
                    selectClassName="remind-input mt-1 text-base"
                    inputClassName="remind-input mt-1 text-base"
                  />
                  <label className="block">
                    <span className="text-xs font-medium text-[var(--rm-text-muted)]">
                      오답 분석 메모
                    </span>
                    <textarea
                      rows={4}
                      value={reflectionMemo}
                      onChange={(e) => setReflectionMemo(e.target.value)}
                      placeholder="무엇을 몰라서 틀렸는지, 다음에 어떻게 풀지 적어 보세요."
                      className="remind-input mt-1 text-base"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetDrafts}
                      className="flex-1 rounded-xl border border-[var(--rm-border)] py-2 text-sm text-[var(--rm-text-muted)]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveReflection()}
                      className="flex-1 rounded-xl bg-[var(--rm-brand)] py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {question.wrongReason ? (
                    <p className="text-sm font-semibold text-rose-700">
                      틀린 이유: {question.wrongReason}
                    </p>
                  ) : null}
                  {(question.wrongKeywords?.length ?? 0) > 0 ||
                  question.wrongReasonDetail ? (
                    <div className="flex flex-wrap gap-1">
                      {(question.wrongKeywords?.length
                        ? question.wrongKeywords
                        : (question.wrongReasonDetail ?? "")
                            .split(/[,，#\s]+/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                      ).map((tag) => (
                        <span
                          key={`w-${tag}`}
                          className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"
                        >
                          오답 #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {question.reflectionMemo ? (
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-[var(--rm-text)]">
                      {question.reflectionMemo}
                    </p>
                  ) : !question.wrongReason ? (
                    <p className="text-sm text-[var(--rm-text-muted)]">
                      아직 적지 않았어요. 「작성」을 눌러 남겨 보세요.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* 3) 문제 — 보고 싶을 때만 펼침 */}
            <div className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
              <button
                type="button"
                onClick={() => setShowProblemSection((v) => !v)}
                className="flex min-h-[44px] w-full items-center justify-between bg-[var(--rm-surface-raised)] px-3 py-2.5 text-left touch-manipulation"
              >
                <span className="text-sm font-bold text-[var(--rm-text)]">
                  문제 보기
                </span>
                <span className="text-xs font-semibold text-[var(--rm-text-muted)]">
                  {showProblemSection ? "접기 ↑" : "펼치기 ↓"}
                </span>
              </button>

              {showProblemSection ? (
                <div className="border-t border-[var(--rm-border)]">
                  {displayLatex || editingLatex ? (
                    <div className="flex justify-end border-b border-[var(--rm-border)] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingLatex) {
                            setProblemLatexDraft(
                              displayLatex || problemLatexDraft,
                            );
                          }
                          if (editingLatex && hasUnsavedChanges) {
                            setMessage("미리보기 중입니다. 저장 전까지 기존 값은 유지됩니다.");
                          }
                          setEditingLatex((v) => !v);
                        }}
                        className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-nav-active)] touch-manipulation"
                      >
                        {editingLatex ? "미리보기" : "수정"}
                      </button>
                    </div>
                  ) : null}

                  {editingLatex ? (
                    <div className="space-y-2 p-3">
                      <MathAwareTextarea
                        rows={8}
                        value={problemLatexDraft}
                        onChange={setProblemLatexDraft}
                        className="remind-input w-full font-mono text-sm leading-6"
                        placeholder="문제 내용 (수식은 $...$ 로)"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSaveLatex()}
                        className="w-full rounded-xl bg-[var(--rm-nav-active)] py-2.5 text-sm font-bold text-white touch-manipulation disabled:opacity-60"
                      >
                        {saving ? "저장 중…" : "문제 문구 저장"}
                      </button>
                    </div>
                  ) : displayLatex ? (
                    <LatexContent
                      content={displayLatex}
                      className="px-4 py-3 text-base"
                    />
                  ) : (
                    <div className="space-y-2 p-3">
                      <p className="text-sm text-[var(--rm-text-muted)]">
                        아직 깔끔한 문제 문구가 없어요. 아래 버튼으로 AI가
                        사진을 읽어 만들어 줍니다.
                      </p>
                      <button
                        type="button"
                        disabled={aiPending}
                        onClick={handleRebuildWithAi}
                        className="w-full rounded-xl bg-[var(--rm-nav-active)] py-2.5 text-sm font-bold text-white touch-manipulation disabled:opacity-60"
                      >
                        {aiPending
                          ? "AI가 문제 만드는 중…"
                          : "사진 → 깔끔한 문제로 바꾸기 (AI 1회)"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 4) 원본 사진 — 보고 싶을 때만 펼침 */}
            <div className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
              <button
                type="button"
                onClick={() => setShowPhotoSection((v) => !v)}
                className="flex min-h-[44px] w-full items-center justify-between bg-[var(--rm-surface-raised)] px-3 py-2.5 text-left touch-manipulation"
              >
                <span className="text-sm font-bold text-[var(--rm-text)]">
                  원본 사진 보기
                </span>
                <span className="text-xs font-semibold text-[var(--rm-text-muted)]">
                  {showPhotoSection ? "접기 ↑" : "펼치기 ↓"}
                </span>
              </button>

              {showPhotoSection ? (
                <div className="relative h-56 border-t border-[var(--rm-border)] bg-[var(--rm-accent-muted)] sm:h-64">
                  <QuestionImages
                    question={question}
                    alt="문제 원본"
                    thumbnail
                    fill
                    imageClassName="object-contain"
                  />
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="w-full rounded-xl border border-[var(--rm-error-border)] py-2.5 text-sm font-semibold text-[var(--rm-danger)] touch-manipulation disabled:opacity-50"
            >
              이 문제 삭제
            </button>
          </div>
        ) : null}
      </li>
      <LatexLightbox
        content={displayLatex}
        open={latexZoomOpen}
        onClose={() => setLatexZoomOpen(false)}
      />
    </>
  );
}
