"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnswerMathInput } from "@/components/student/answer-math-input";
import { QuestionImages } from "@/components/student/question-images";
import { LatexContent } from "@/components/math/latex-content";
import { MathAnswerView } from "@/components/math/math-answer-view";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { isMathAnswerSubject } from "@/lib/utils/normalize-answer";
import { getAnswerImageUrls } from "@/lib/utils/question-images";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getStreakTarget,
  submitAnswer,
  willCompleteLongPhase,
} from "@/lib/data/answer-question";
import {
  getTodayReviewQuestions,
  getUpcomingReviewCount,
  type StoredQuestion,
} from "@/lib/data/questions";
import { useSubjects } from "@/components/student/subject-provider";
import { formatDate, getPhaseHint, getPhaseLabel } from "@/lib/utils/labels";
import type { CompletedAction } from "@/types/question";

type Props = {
  userId: string;
};

export function TodayStudySession({ userId }: Props) {
  const router = useRouter();
  const { getSubjectName } = useSubjects();
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnswer, setMyAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
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
      getUpcomingReviewCount(userId),
    ]);
    setQuestions(today);
    setUpcomingCount(upcoming);
    setCurrentIndex(0);
    setMyAnswer("");
    setRevealed(false);
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
  const mathTools = current
    ? isMathAnswerSubject(current.subjectId, getSubjectName(current.subjectId))
    : false;
  const answerImageUrls = current ? getAnswerImageUrls(current) : [];
  const hasOfficialAnswer = Boolean(
    current?.answerText || answerImageUrls.length > 0,
  );

  useEffect(() => {
    if (!current) {
      setStreakTarget(0);
      return;
    }
    void getStreakTarget(userId, current).then(setStreakTarget);
  }, [current, userId]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback, currentIndex]);

  function goNext(message?: string) {
    setMyAnswer("");
    setRevealed(false);
    setPendingCompletion(null);
    if (message) setFeedback(message);
    else setFeedback(null);

    if (currentIndex + 1 >= questions.length) {
      setCurrentIndex(questions.length);
      router.refresh();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  async function handleAnswer(result: "correct" | "incorrect") {
    if (!current || !revealed) return;
    setFeedback(null);

    if (await willCompleteLongPhase(userId, current, result)) {
      setPendingCompletion(current);
      return;
    }

    const updated = await submitAnswer(userId, current, result);
    const nextDate = updated?.nextReviewDate;

    if (result === "incorrect") {
      goNext("틀렸어요. 내일 다시 풀어요.");
      return;
    }

    if (updated?.phase === "medium" && current.phase === "short") {
      goNext("단기 완료! 이제 중기(더 뒤에 다시)로 넘어가요.");
      return;
    }

    if (updated?.phase === "long" && current.phase === "medium") {
      goNext("중기 완료! 이제 장기(오래 뒤에 다시)로 넘어가요.");
      return;
    }

    goNext(
      nextDate
        ? `맞았어요! 다음 다시 풀기: ${formatDate(nextDate)}`
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
      goNext("보관 완료로 저장했어요.");
      return;
    }

    await submitAnswer(userId, pendingCompletion, "correct", "review_once_more");
    goNext("14일 후 다시 풀어요.");
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
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 text-center text-sm text-[var(--rm-text-muted)] shadow-sm">
        불러오는 중...
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        data-tour-id="student-study-empty"
        className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 text-center shadow-sm"
      >
        <p className="font-semibold text-[var(--rm-text)]">
          {UI_LABELS.todayQueueEmpty}
        </p>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          오늘 올린 문제는 보통 다음 날부터 여기에 나타나요.
        </p>
        {upcomingCount > 0 ? (
          <div className="mt-4 rounded-xl bg-[var(--rm-info-bg)] p-4 text-sm text-[var(--rm-text-on-info)]">
            <p>
              앞으로 다시 풀 예정인 문제가{" "}
              <strong>{upcomingCount}개</strong> 있어요.
            </p>
            <p className="mt-1 text-[11px] opacity-90">
              날짜가 되면 「다시 풀기」에 자동으로 떠요.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--rm-text-faint)]">
            아직 예정된 문제도 없어요. 새 오답을 등록해 보세요.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--rm-brand)] px-5 text-sm font-bold text-white"
          >
            문제 등록하기
          </Link>
          <Link
            href="/archive"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--rm-border)] px-5 text-sm font-semibold text-[var(--rm-text)]"
          >
            보관함 보기
          </Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="rounded-2xl border border-[var(--rm-success-border)] bg-[var(--rm-success-bg)] p-4 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--rm-text-on-success)]">
          오늘의 학습을 완료했어요!
        </p>
        <p className="mt-2 text-sm text-[var(--rm-text-on-success)]">
          {total}문제를 모두 풀었습니다.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block rounded-xl bg-[var(--rm-brand)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          홈으로
        </Link>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-3">
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
      <p className="text-[11px] text-[var(--rm-text-muted)]">
        {getPhaseHint(current.phase)}
        {streakTarget > 0
          ? ` · 이 단계 ${current.streakCount}/${streakTarget}회`
          : ""}
      </p>

      {feedback ? (
        <p className="rounded-lg bg-[var(--rm-info-bg)] px-3 py-2 text-sm text-[var(--rm-text-on-info)]">
          {feedback}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] shadow-sm">
        <div
          data-tour-id="student-study-problem"
          className="relative bg-[var(--rm-surface-raised)]"
        >
          <QuestionImages
            question={current}
            alt="문제"
            imageClassName="h-auto max-h-96 w-full object-contain"
          />
        </div>

        <div className="mx-auto max-w-xl space-y-3 p-3.5">
          {current.problemLatex ? (
            <section className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-4">
              <p className="mb-2 text-xs font-bold text-[var(--rm-text-muted)]">
                문제
              </p>
              <LatexContent content={current.problemLatex} className="text-base" />
            </section>
          ) : null}

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

          {!revealed ? (
            <div className="space-y-3">
              <div data-tour-id="student-study-answer">
                <AnswerMathInput
                  value={myAnswer}
                  onChange={setMyAnswer}
                  label="내 답"
                  showMathTools={mathTools}
                  placeholder={
                    mathTools ? "예: (1/2)x^2+2x 또는 ③" : "예: ③ 또는 119°"
                  }
                />
              </div>
              <p className="text-[11px] leading-4 text-[var(--rm-text-muted)]">
                먼저 답을 적어 보세요. 정답·오답 메모는 「정답 확인」 후에 보여요.
              </p>
              <button
                type="button"
                data-tour-id="student-study-reveal"
                onClick={() => {
                  setFeedback(null);
                  setRevealed(true);
                }}
                className="min-h-[48px] w-full rounded-xl bg-[var(--rm-brand)] py-3 text-base font-bold text-white touch-manipulation hover:opacity-90"
              >
                정답 확인
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myAnswer.trim() ? (
                <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] px-3 py-3">
                  <p className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
                    내가 쓴 답
                  </p>
                  <MathAnswerView
                    content={myAnswer}
                    className="mt-1 text-base"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-[var(--rm-text-muted)]">
                  답을 적지 않고 확인했어요.
                </p>
              )}

              {hasOfficialAnswer ? (
                <div className="space-y-2 rounded-xl border border-[var(--rm-success-border)] bg-[var(--rm-success-bg)] p-3">
                  <p className="text-xs font-bold text-[var(--rm-text-on-success)]">
                    등록된 정답 · 해설
                  </p>
                  {answerImageUrls.length > 0 ? (
                    <QuestionImages
                      question={{
                        imageDataUrl: answerImageUrls[0]!,
                        extraImageDataUrls: answerImageUrls.slice(1),
                      }}
                      alt="해설 사진"
                      className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                      imageClassName="max-h-64 w-full object-contain"
                    />
                  ) : null}
                  {current.answerText ? (
                    <MathAnswerView
                      content={current.answerText}
                      className="text-base"
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-[var(--rm-text-faint)]">
                  등록된 정답·해설이 없어요. 기억나는 대로 스스로 채점해 주세요.
                </p>
              )}

              {current.reflectionMemo || current.wrongReason ? (
                <div className="rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] p-3">
                  <p className="text-xs font-bold text-[var(--rm-text-on-info)]">
                    오답 메모
                  </p>
                  {current.wrongReason ? (
                    <span className="mt-1 inline-block rounded-md bg-[color-mix(in_srgb,var(--rm-danger)_12%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--rm-danger)]">
                      {current.wrongReason}
                    </span>
                  ) : null}
                  {current.reflectionMemo ? (
                    <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-[var(--rm-text)]">
                      {current.reflectionMemo}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="text-center text-sm font-medium text-[var(--rm-text)]">
                맞았나요?
              </p>
            </div>
          )}
        </div>
      </div>

      {pendingCompletion ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--rm-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] p-3.5 shadow-sm">
          <p className="font-semibold text-[var(--rm-text)]">
            장기 다시 풀기를 완료했어요!
          </p>
          <p className="mt-1 text-sm text-[var(--rm-text)]">
            이 문제를 어떻게 할까요?
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void handleCompletedAction("delete")}
              className="min-h-[48px] rounded-xl border border-[color-mix(in_srgb,var(--rm-warning)_45%,transparent)] bg-[var(--rm-surface)] py-3 text-base font-medium text-[var(--rm-text)] touch-manipulation hover:bg-[color-mix(in_srgb,var(--rm-warning)_14%,var(--rm-surface))]"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={() => void handleCompletedAction("archive")}
              className="min-h-[48px] rounded-xl border border-[color-mix(in_srgb,var(--rm-warning)_45%,transparent)] bg-[var(--rm-surface)] py-3 text-base font-medium text-[var(--rm-text)] touch-manipulation hover:bg-[color-mix(in_srgb,var(--rm-warning)_14%,var(--rm-surface))]"
            >
              보관 완료로 저장
            </button>
            <button
              type="button"
              onClick={() => void handleCompletedAction("review_once_more")}
              className="min-h-[48px] rounded-xl bg-[var(--rm-warning)] py-2.5 text-base font-semibold text-white touch-manipulation hover:opacity-90"
            >
              한 번 더 다시 풀기
            </button>
          </div>
        </div>
      ) : revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleAnswer("incorrect")}
            className="min-h-[48px] rounded-xl bg-[var(--rm-danger)] py-2.5 text-base font-semibold text-white touch-manipulation hover:opacity-90"
          >
            틀렸어요
          </button>
          <button
            type="button"
            onClick={() => void handleAnswer("correct")}
            className="min-h-[48px] rounded-xl bg-[var(--rm-brand)] py-2.5 text-base font-semibold text-white touch-manipulation hover:opacity-90"
          >
            맞았어요
          </button>
        </div>
      ) : null}
    </div>
  );
}
