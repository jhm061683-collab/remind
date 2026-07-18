"use client";

import { useState, useTransition } from "react";
import {
  deleteQuestionAction,
  updateProblemLatexAction,
  updateReflectionAction,
} from "@/lib/actions/questions";
import { ocrFromImageAction } from "@/lib/actions/ocr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionImages } from "@/components/student/question-images";
import { ZoomableQuestionImage } from "@/components/student/zoomable-question-image";
import { LatexContent } from "@/components/math/latex-content";
import { LatexLightbox } from "@/components/math/latex-lightbox";
import { KeywordPicker } from "@/components/student/keyword-picker";
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
import { recordKeywordUsage } from "@/lib/data/keyword-library";
import { deleteQuestion, updateQuestion, type StoredQuestion } from "@/lib/data/questions";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { formatDate } from "@/lib/utils/labels";
import { getQuestionImageUrls } from "@/lib/utils/question-images";

type Props = {
  question: StoredQuestion;
  userId: string;
  subjectName: string;
  archived: boolean;
  onDelete: (id: string) => void;
  onUpdate: (question: StoredQuestion) => void;
};

export function QuestionArchiveCard({
  question,
  userId,
  subjectName,
  archived,
  onDelete,
  onUpdate,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(question.source ?? "");
  const [keywords, setKeywords] = useState<string[]>(question.keywords ?? []);
  const [wrongReason, setWrongReason] = useState(question.wrongReason ?? "");
  const [wrongKeywords, setWrongKeywords] = useState<string[]>(
    question.wrongKeywords?.length
      ? question.wrongKeywords
      : question.wrongReasonDetail
        ? question.wrongReasonDetail
            .split(/[,，#\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
  );
  const [reflectionMemo, setReflectionMemo] = useState(
    question.reflectionMemo ?? "",
  );
  const [problemLatexDraft, setProblemLatexDraft] = useState(
    question.problemLatex ?? "",
  );
  const [editingLatex, setEditingLatex] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latexZoomOpen, setLatexZoomOpen] = useState(false);
  const [aiPending, startAi] = useTransition();

  const hasAnswer = Boolean(question.answerText || question.answerImageDataUrl);
  const hasReflection = Boolean(
    question.reflectionMemo ||
      question.wrongReason ||
      (question.wrongKeywords && question.wrongKeywords.length > 0) ||
      question.wrongReasonDetail ||
      question.source,
  );
  const displayLatex = question.problemLatex ?? "";

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
      if (keywords.length > 0) void recordKeywordUsage(userId, "problem", keywords);
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
    startAi(async () => {
      const result = await ocrFromImageAction({
        imageDataUrl: urls[0]!,
        extraImageDataUrls: urls.slice(1),
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const latex = result.result?.problemLatex?.trim() ?? "";
      if (!latex) {
        setMessage("AI가 문제를 읽지 못했어요. 사진을 확인해 주세요.");
        return;
      }

      setProblemLatexDraft(latex);
      setEditingLatex(true);

      if (isSupabaseEnabled()) {
        const saved = await updateProblemLatexAction({
          questionId: question.id,
          problemLatex: latex,
        });
        if (saved.error) {
          setMessage(saved.error);
          return;
        }
        if (saved.question) onUpdate(saved.question);
      } else {
        const updated = await updateQuestion(userId, question.id, {
          problemLatex: latex,
        });
        if (updated) onUpdate(updated);
      }

      if (result.result?.keywords?.length) {
        setKeywords((prev) => {
          const merged = [...prev];
          for (const k of result.result!.keywords) {
            if (!merged.includes(k)) merged.push(k);
          }
          return merged.slice(0, 12);
        });
      }

      setMessage(
        "깔끔한 문제로 바꿨어요. 틀린 부분은 수정 버튼으로 고쳐 주세요.",
      );
    });
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
      <li className="remind-card overflow-hidden">
        {displayLatex ? (
          <button
            type="button"
            onClick={() => setLatexZoomOpen(true)}
            className="relative block max-h-64 w-full overflow-hidden border-b border-[var(--rm-border)] bg-[var(--rm-surface)] text-left"
          >
            <LatexContent
              content={displayLatex}
              className="px-4 py-3.5 text-[15px]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--rm-surface)] to-transparent" />
            <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
              <span aria-hidden>🔍</span> 크게 보기
            </span>
          </button>
        ) : (
          <div className="relative h-48 bg-[var(--rm-accent-muted)] sm:h-56">
            <QuestionImages
              question={question}
              alt="문제"
              thumbnail
              fill
              imageClassName="object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
              <button
                type="button"
                disabled={aiPending}
                onClick={handleRebuildWithAi}
                className="w-full rounded-xl bg-[var(--rm-nav-active)] px-3 py-2.5 text-sm font-bold text-white touch-manipulation disabled:opacity-60"
              >
                {aiPending
                  ? "AI가 문제 만드는 중…"
                  : "사진 → 깔끔한 문제로 바꾸기"}
              </button>
            </div>
          </div>
        )}

        <div className="p-3.5 text-base">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-[var(--rm-text)]">{subjectName}</p>
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
          {question.source ? (
            <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
              출처: {question.source}
            </p>
          ) : null}
          {question.wrongReason ? (
            <span className="mt-2 inline-block rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {question.wrongReason}
            </span>
          ) : null}
          {question.keywords.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {question.keywords.slice(0, 4).map((tag) => (
                <span key={tag} className="remind-tag">
                  #{tag}
                </span>
              ))}
              {question.keywords.length > 4 ? (
                <span className="text-[11px] text-[var(--rm-text-faint)]">
                  +{question.keywords.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="mt-1 text-[var(--rm-text-muted)]">
            등록: {formatDate(question.createdAt)}
          </p>

          {displayLatex ? (
            <button
              type="button"
              disabled={aiPending}
              onClick={handleRebuildWithAi}
              className="mt-2 w-full rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface)] py-2 text-xs font-semibold text-[var(--rm-text-muted)] touch-manipulation disabled:opacity-60"
            >
              {aiPending ? "AI 다시 읽는 중…" : "AI로 문제 다시 만들기"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] py-2.5 text-xs font-bold text-[var(--rm-text-on-info)] touch-manipulation"
          >
            {expanded ? "접기 ↑" : "자세히 보기 · 정답·오답 분석 ↓"}
          </button>
        </div>

        {expanded ? (
          <div className="space-y-3 border-t border-[var(--rm-border)] px-3.5 pb-3.5">
            <div className="overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
              <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2">
                <p className="text-sm font-bold text-[var(--rm-text)]">문제</p>
                {displayLatex || editingLatex ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingLatex) {
                        setProblemLatexDraft(displayLatex || problemLatexDraft);
                      }
                      setEditingLatex((v) => !v);
                    }}
                    className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-nav-active)] touch-manipulation"
                  >
                    {editingLatex ? "미리보기" : "수정"}
                  </button>
                ) : null}
              </div>

              {editingLatex ? (
                <div className="space-y-2 p-3">
                  <textarea
                    rows={8}
                    value={problemLatexDraft}
                    onChange={(e) => setProblemLatexDraft(e.target.value)}
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
                    아직 깔끔한 문제 문구가 없어요. 아래 버튼으로 AI가 사진을
                    읽어 만들어 줍니다.
                  </p>
                  <button
                    type="button"
                    disabled={aiPending}
                    onClick={handleRebuildWithAi}
                    className="w-full rounded-xl bg-[var(--rm-nav-active)] py-2.5 text-sm font-bold text-white touch-manipulation disabled:opacity-60"
                  >
                    {aiPending
                      ? "AI가 문제 만드는 중…"
                      : "사진 → 깔끔한 문제로 바꾸기"}
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--rm-border)]">
              <p className="border-b border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-2 text-xs font-bold text-[var(--rm-text-muted)]">
                원본 사진
              </p>
              <div className="relative bg-[var(--rm-accent-muted)]">
                <QuestionImages
                  question={question}
                  alt="문제 원본"
                  imageClassName="h-auto max-h-80 w-full object-contain"
                />
              </div>
            </div>

            {message ? (
              <p className="rounded-lg bg-[var(--rm-success-bg)] px-3 py-2 text-xs text-[var(--rm-text-on-success)]">
                {message}
              </p>
            ) : null}

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
                      onClick={() => setEditing(false)}
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

            <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
              <p className="text-sm font-bold text-[var(--rm-text)]">정답 · 해설</p>
              {!hasAnswer ? (
                <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
                  등록할 때 넣은 해설이 없어요.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {question.answerImageDataUrl ? (
                    <div className="relative overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)]">
                      <ZoomableQuestionImage
                        src={question.answerImageDataUrl}
                        alt="해설"
                        width={800}
                        height={400}
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  {question.answerText ? (
                    <LatexContent
                      content={question.answerText}
                      className="text-base"
                    />
                  ) : null}
                </div>
              )}
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
