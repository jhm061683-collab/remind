"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuestionImages } from "@/components/student/question-images";
import { ZoomableQuestionImage } from "@/components/student/zoomable-question-image";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getStreakTarget,
  submitAnswer,
  willCompleteLongPhase,
} from "@/lib/data/answer-question";
import {
  bringAllReviewsToToday,
  getTodayReviewQuestions,
  getUpcomingReviewQuestions,
  type StoredQuestion,
} from "@/lib/data/questions";
import { useSubjects } from "@/components/student/subject-provider";
import { formatDate, getPhaseLabel } from "@/lib/utils/labels";
import type { CompletedAction } from "@/types/question";

type Props = {
  userId: string;
};

export function TodayStudySession({ userId }: Props) {
  const router = useRouter();
  const { getSubjectName } = useSubjects();
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pendingCompletion, setPendingCompletion] =
    useState<StoredQuestion | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [streakTarget, setStreakTarget] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  const loadQuestions = useCallback(async () => {
    const [today, upcoming] = await Promise.all([
      getTodayReviewQuestions(userId),
      getUpcomingReviewQuestions(userId),
    ]);
    setQuestions(today);
    setUpcomingCount(upcoming.length);
    setCurrentIndex(0);
    setShowAnswer(false);
    setPendingCompletion(null);
    setFeedback(null);
  }, [userId]);

  useEffect(() => {
    void loadQuestions().then(() => setIsReady(true));
  }, [loadQuestions]);

  const current = questions[currentIndex];
  const total = questions.length;
  const isFinished = isReady && total > 0 && currentIndex >= total;
  const isEmpty = isReady && total === 0;

  useEffect(() => {
    if (!current) {
      setStreakTarget(0);
      return;
    }
    void getStreakTarget(userId, current).then(setStreakTarget);
  }, [current, userId]);

  function goNext(message?: string) {
    if (message) setFeedback(message);
    setShowAnswer(false);
    setPendingCompletion(null);

    if (currentIndex + 1 >= questions.length) {
      setCurrentIndex(questions.length);
      router.refresh();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  async function handleAnswer(result: "correct" | "incorrect") {
    if (!current) return;

    if (await willCompleteLongPhase(userId, current, result)) {
      setPendingCompletion(current);
      return;
    }

    const updated = await submitAnswer(userId, current, result);
    const nextDate = updated?.nextReviewDate;

    if (result === "incorrect") {
      goNext("틀렸어요. 내일 다시 복습합니다.");
      return;
    }

    if (updated?.phase === "medium" && current.phase === "short") {
      goNext("단기 복습 완료! 중기 복습으로 전환됩니다.");
      return;
    }

    if (updated?.phase === "long" && current.phase === "medium") {
      goNext("중기 복습 완료! 장기 복습으로 전환됩니다.");
      return;
    }

    goNext(
      nextDate
        ? `맞았어요! 다음 복습: ${formatDate(nextDate)}`
        : "맞았어요!",
    );
  }

  async function handleCompletedAction(action: CompletedAction) {
    if (!pendingCompletion) return;

    if (action === "delete") {
      setShowDeleteConfirm(true);
      return;
    }

    if (action === "archive") {
      await submitAnswer(userId, pendingCompletion, "correct", "archive");
      goNext("보관함에 저장했습니다.");
      return;
    }

    await submitAnswer(userId, pendingCompletion, "correct", "review_once_more");
    goNext("14일 후 다시 복습합니다.");
  }

  async function handleDeleteConfirm() {
    if (!pendingCompletion) return;
    setDeleteProcessing(true);
    try {
      await submitAnswer(userId, pendingCompletion, "correct", "delete");
      setShowDeleteConfirm(false);
      goNext("문제를 삭제했습니다.");
    } finally {
      setDeleteProcessing(false);
    }
  }

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-8 text-center text-sm text-[var(--rm-text-muted)] shadow-sm">
        불러오는 중...
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 text-center shadow-sm">
        <p className="text-[var(--rm-text-muted)]">{UI_LABELS.todayQueueEmpty}</p>
        <p className="mt-2 text-sm text-[var(--rm-text-faint)]">
          문제를 업로드하면 보통 다음 날부터 여기에 나타납니다.
        </p>
        {upcomingCount > 0 ? (
          <div className="mt-4 rounded-xl bg-[var(--rm-info-bg)] p-4 text-sm text-[var(--rm-text-on-info)]">
            <p>
              내일부터 복습 예정인 문제가{" "}
              <strong>{upcomingCount}개</strong> 있습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                void bringAllReviewsToToday(userId).then(() => loadQuestions());
              }}
              className="mt-3 rounded-lg bg-[var(--rm-brand)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              테스트: 지금 바로 복습하기
            </button>
          </div>
        ) : null}
        <Link
          href="/upload"
          className="mt-4 inline-block text-sm font-medium text-[var(--rm-nav-active)] hover:underline"
        >
          문제 등록하기 →
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="rounded-2xl border border-[var(--rm-success-border)] bg-[var(--rm-success-bg)] p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--rm-text-on-success)]">
          오늘의 학습을 완료했어요!
        </p>
        <p className="mt-2 text-sm text-[var(--rm-text-on-success)]">
          {total}문제를 모두 풀었습니다.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
        >
          홈으로
        </Link>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={showDeleteConfirm}
        title="문제를 삭제할까요?"
        description={
          pendingCompletion
            ? `「${getSubjectName(pendingCompletion.subjectId)}」 문제를 삭제합니다.\n\n사진과 기록이 모두 지워지고 되돌릴 수 없어요.`
            : ""
        }
        confirmLabel="삭제하기"
        cancelLabel="취소"
        variant="danger"
        loading={deleteProcessing}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <div className="flex items-center justify-between text-sm text-[var(--rm-text-muted)]">
        <span>
          {currentIndex + 1} / {total}
        </span>
        <span className="rounded-full bg-[var(--rm-info-bg)] px-3 py-1 text-xs font-medium text-[var(--rm-text-on-info)]">
          {getSubjectName(current.subjectId)} · {getPhaseLabel(current.phase)}
          {streakTarget > 0
            ? ` ${current.streakCount}/${streakTarget}`
            : ""}
        </span>
      </div>

      {feedback ? (
        <p className="rounded-lg bg-[var(--rm-info-bg)] px-3 py-2 text-sm text-[var(--rm-text-on-info)]">
          {feedback}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-sm">
        <div className="relative bg-[var(--rm-surface-raised)]">
          <QuestionImages
            question={current}
            alt="문제"
            imageClassName="h-auto max-h-96 w-full object-contain"
          />
        </div>

        <div className="space-y-3 p-4">
          {current.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {current.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-[var(--rm-accent-muted)] px-2 py-0.5 text-xs text-[var(--rm-text-muted)]"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          ) : null}

          {current.reflectionMemo || current.wrongReason ? (
            <div className="rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] p-3">
              <p className="text-xs font-bold text-[var(--rm-text-on-info)]">
                왜 틀렸는지 · 모르는 개념
              </p>
              {current.wrongReason ? (
                <span className="mt-1 inline-block rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {current.wrongReason}
                </span>
              ) : null}
              {current.reflectionMemo ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--rm-text)]">
                  {current.reflectionMemo}
                </p>
              ) : null}
            </div>
          ) : null}

          {current.answerText || current.answerImageDataUrl ? (
            <>
              <button
                type="button"
                onClick={() => setShowAnswer((prev) => !prev)}
                className="text-sm font-medium text-[var(--rm-nav-active)] hover:underline"
              >
                {showAnswer ? "해설 숨기기" : "정답 / 해설 보기"}
              </button>
              {showAnswer ? (
                <div className="space-y-2">
                  {current.answerImageDataUrl ? (
                    <div className="relative overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface-raised)]">
                      <ZoomableQuestionImage
                        src={current.answerImageDataUrl}
                        alt="해설 사진"
                        width={800}
                        height={600}
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  {current.answerText ? (
                    <p className="rounded-lg bg-[var(--rm-surface-raised)] px-3 py-2 text-sm text-[var(--rm-text)] whitespace-pre-wrap">
                      {current.answerText}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-[var(--rm-text-faint)]">등록된 해설이 없습니다.</p>
          )}
        </div>
      </div>

      {pendingCompletion ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--rm-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] p-5 shadow-sm">
          <p className="font-semibold text-[var(--rm-text)]">
            장기 복습을 완료했어요!
          </p>
          <p className="mt-1 text-sm text-[var(--rm-text)]">
            이 문제를 어떻게 할까요?
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void handleCompletedAction("delete")}
              className="rounded-xl border border-[color-mix(in_srgb,var(--rm-warning)_45%,transparent)] bg-[var(--rm-surface)] py-3 text-sm font-medium text-[var(--rm-text)] hover:bg-[color-mix(in_srgb,var(--rm-warning)_14%,var(--rm-surface))]"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => void handleCompletedAction("archive")}
              className="rounded-xl border border-[color-mix(in_srgb,var(--rm-warning)_45%,transparent)] bg-[var(--rm-surface)] py-3 text-sm font-medium text-[var(--rm-text)] hover:bg-[color-mix(in_srgb,var(--rm-warning)_14%,var(--rm-surface))]"
            >
              보관함 저장
            </button>
            <button
              type="button"
              onClick={() => void handleCompletedAction("review_once_more")}
              className="rounded-xl bg-[var(--rm-warning)] py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              한 번 더 복습
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleAnswer("incorrect")}
            className="rounded-xl bg-[var(--rm-danger)] py-4 text-sm font-semibold text-white hover:opacity-90"
          >
            틀렸어요
          </button>
          <button
            type="button"
            onClick={() => void handleAnswer("correct")}
            className="rounded-xl bg-green-600 py-4 text-sm font-semibold text-white hover:bg-green-700"
          >
            맞았어요
          </button>
        </div>
      )}
    </div>
  );
}
