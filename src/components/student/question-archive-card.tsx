"use client";

import { useState } from "react";
import {
  deleteQuestionAction,
  updateReflectionAction,
} from "@/lib/actions/questions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionImage } from "@/components/student/question-image";
import { QuestionImages } from "@/components/student/question-images";
import { KeywordPicker } from "@/components/student/keyword-picker";
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
import { recordKeywordUsage } from "@/lib/data/keyword-library";
import { deleteQuestion, updateQuestion, type StoredQuestion } from "@/lib/data/questions";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { formatDate } from "@/lib/utils/labels";

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasAnswer = Boolean(question.answerText || question.answerImageDataUrl);
  const hasReflection = Boolean(
    question.reflectionMemo ||
      question.wrongReason ||
      (question.wrongKeywords && question.wrongKeywords.length > 0) ||
      question.wrongReasonDetail ||
      question.source,
  );

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
        {/* 썸네일: 문제 사진만 (여러 장이면 넘김) */}
        <div className="relative h-48 bg-slate-100 sm:h-56">
          <QuestionImages
            question={question}
            alt="문제"
            thumbnail
            fill
            imageClassName="object-contain"
          />
        </div>

        <div className="p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{subjectName}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                archived
                  ? "bg-violet-100 text-violet-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {archived ? UI_LABELS.statusArchived : UI_LABELS.statusKeeping}
            </span>
          </div>
          {question.source ? (
            <p className="mt-1 text-xs text-slate-500">출처: {question.source}</p>
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
                <span className="text-[11px] text-slate-400">
                  +{question.keywords.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className="mt-1 text-slate-500">등록: {formatDate(question.createdAt)}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 touch-manipulation"
          >
            {expanded ? "접기 ↑" : "자세히 보기 · 정답·오답 분석 ↓"}
          </button>
        </div>

        {expanded ? (
          <div className="space-y-4 border-t border-slate-100 px-4 pb-4">
            {message ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
                {message}
              </p>
            ) : null}

            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-blue-900">오답 분석</p>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-semibold text-blue-700"
                  >
                    {hasReflection ? "수정" : "작성"}
                  </button>
                ) : null}
              </div>

              {editing ? (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">문제 출처</span>
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="예: 26년 6월 모평 22번"
                      className="remind-input mt-1 text-sm"
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
                    selectClassName="remind-input mt-1 text-sm"
                    inputClassName="remind-input mt-1 text-sm"
                  />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">
                      오답 분석 메모
                    </span>
                    <textarea
                      rows={4}
                      value={reflectionMemo}
                      onChange={(e) => setReflectionMemo(e.target.value)}
                      placeholder="무엇을 몰라서 틀렸는지, 다음에 어떻게 풀지 적어 보세요."
                      className="remind-input mt-1 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveReflection()}
                      className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {question.reflectionMemo}
                    </p>
                  ) : !question.wrongReason ? (
                    <p className="text-sm text-slate-500">
                      아직 적지 않았어요. 「작성」을 눌러 남겨 보세요.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">정답 · 해설</p>
              {!hasAnswer ? (
                <p className="mt-2 text-sm text-slate-500">
                  등록할 때 넣은 해설이 없어요.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {question.answerImageDataUrl ? (
                    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <QuestionImage
                        src={question.answerImageDataUrl}
                        alt="해설"
                        width={800}
                        height={400}
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  {question.answerText ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {question.answerText}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 touch-manipulation disabled:opacity-50"
            >
              이 문제 삭제
            </button>
          </div>
        ) : null}
      </li>
    </>
  );
}
