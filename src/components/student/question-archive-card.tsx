"use client";

import { useState } from "react";
import {
  deleteQuestionAction,
  updateReflectionAction,
} from "@/lib/actions/questions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionImage } from "@/components/student/question-image";
import { QuestionImages } from "@/components/student/question-images";
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
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
  const [showAnswer, setShowAnswer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(question.source ?? "");
  const [wrongReason, setWrongReason] = useState(question.wrongReason ?? "");
  const [wrongReasonDetail, setWrongReasonDetail] = useState(
    question.wrongReasonDetail ?? "",
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
      question.wrongReasonDetail ||
      question.source,
  );

  async function handleSaveReflection() {
    setSaving(true);
    setMessage(null);
    try {
      const patch = {
        source: source.trim() || undefined,
        wrongReason: wrongReason || undefined,
        wrongReasonDetail: wrongReasonDetail.trim() || undefined,
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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left touch-manipulation"
      >
        <div className="relative h-40 bg-slate-50">
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
              {question.wrongReasonDetail
                ? ` · ${question.wrongReasonDetail}`
                : ""}
            </span>
          ) : null}
          <p className="mt-1 text-slate-500">
            등록: {formatDate(question.createdAt)}
          </p>
          {question.keywords.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {question.keywords.map((tag) => (
                <span key={tag} className="remind-tag">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {!expanded && question.reflectionMemo ? (
            <p className="mt-2 line-clamp-2 text-slate-600">
              {question.reflectionMemo}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-blue-600">
            {expanded ? "접기 ↑" : "자세히 보기 ↓"}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4">
          <QuestionImages
            question={question}
            alt="문제"
            imageClassName="max-h-80 w-full rounded-lg border border-slate-200 bg-white object-contain"
          />
          {message ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
              {message}
            </p>
          ) : null}

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-blue-900">
                왜 틀렸는지 · 모르는 개념
              </p>
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
            <p className="mt-0.5 text-xs text-blue-700/70">
              검색 키워드와 별개예요. 나중에 복습할 때 여기를 봅니다.
            </p>

            {editing ? (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">
                    문제 출처
                  </span>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="예: 26년 6월 모평 22번"
                    className="remind-input mt-1 text-sm"
                  />
                </label>
                <WrongReasonFields
                  userId={userId}
                  wrongReason={wrongReason}
                  wrongReasonDetail={wrongReasonDetail}
                  onWrongReasonChange={setWrongReason}
                  onWrongReasonDetailChange={setWrongReasonDetail}
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
            ) : question.reflectionMemo ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {question.reflectionMemo}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                아직 적지 않았어요. 「작성」을 눌러 틀린 이유를 남겨 보세요.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">정답 · 해설</p>
              {hasAnswer ? (
                <button
                  type="button"
                  onClick={() => setShowAnswer((v) => !v)}
                  className="text-xs font-semibold text-blue-600"
                >
                  {showAnswer ? "숨기기" : "보기"}
                </button>
              ) : null}
            </div>
            {!hasAnswer ? (
              <p className="mt-2 text-sm text-slate-500">
                등록할 때 넣은 해설이 없어요.
              </p>
            ) : showAnswer ? (
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
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                「보기」를 누르면 해설을 볼 수 있어요.
              </p>
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
