"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ocrFromImageAction } from "@/lib/actions/ocr";
import { saveQuestionsBatchAction } from "@/lib/actions/questions";
import { uploadImageAction } from "@/lib/actions/upload-image";
import {
  MultiImagePicker,
  type ImagePage,
} from "@/components/student/multi-image-picker";
import { useSubjects } from "@/components/student/subject-provider";
import { uploadDataUrl } from "@/lib/db/images";
import {
  StorageBlockedError,
  StorageQuotaError,
  saveQuestion,
} from "@/lib/data/questions";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { isLocalStorageAvailable } from "@/lib/storage/safe-storage";
import { KeywordPicker } from "@/components/student/keyword-picker";
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
import { recordKeywordUsage } from "@/lib/data/keyword-library";
import {
  ProblemDraftList,
  type ProblemDraft,
} from "@/components/student/problem-draft-list";
import { AnswerMathInput } from "@/components/student/answer-math-input";
import {
  isMathAnswerSubject,
  normalizeAnswerText,
} from "@/lib/utils/normalize-answer";
import type { StudentAiQuotaStatus } from "@/lib/server/ai/engine-quota";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  cropExtractedFigures,
  embedProblemFigures,
} from "@/lib/utils/problem-figures";
import { composeProblemLatex } from "@/lib/utils/problem-latex";
import {
  encodeSolveConfidenceMemo,
  type SolveConfidence,
} from "@/lib/utils/solve-confidence";

type Props = {
  userId: string;
  defaultSubjectId?: string;
  initialAiQuota?: StudentAiQuotaStatus | null;
};

function canPersist(userId: string): boolean {
  if (!userId || userId === "guest") return false;
  if (isSupabaseEnabled()) return true;
  return isLocalStorageAvailable();
}

let draftIdCounter = 0;
function nextDraftId() {
  draftIdCounter += 1;
  return `draft-${draftIdCounter}`;
}

export function QuestionUploadForm({
  userId,
  defaultSubjectId,
  initialAiQuota = null,
}: Props) {
  const saveRequestIdRef = useRef<string | null>(null);
  const router = useRouter();
  const { subjects, getSubjectName, loading: subjectsLoading } = useSubjects();
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const effectiveSubjectId =
    subjectId ||
    (subjects.length > 0
      ? (defaultSubjectId
          ? subjects.find((s) => s.id === defaultSubjectId)?.id
          : undefined) ?? subjects[0]?.id ?? ""
      : "");
  const mathTools = isMathAnswerSubject(
    effectiveSubjectId,
    getSubjectName(effectiveSubjectId),
  );
  const [questionPages, setQuestionPages] = useState<ImagePage[]>([]);
  const [questionReady, setQuestionReady] = useState(false);
  const [answerPages, setAnswerPages] = useState<ImagePage[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [wrongReason, setWrongReason] = useState("");
  const [wrongKeywords, setWrongKeywords] = useState<string[]>([]);
  const [solveConfidence, setSolveConfidence] = useState<SolveConfidence | "">(
    "",
  );
  const [reflectionMemo, setReflectionMemo] = useState("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entryChoice, setEntryChoice] = useState<"manual" | "ai" | null>(null);
  const [aiQuality, setAiQuality] = useState<"standard" | "advanced">(
    initialAiQuota?.preferAdvanced ? "advanced" : "standard",
  );
  const [aiQuota, setAiQuota] = useState(initialAiQuota);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [sharedPassage, setSharedPassage] = useState("");
  const [drafts, setDrafts] = useState<ProblemDraft[]>([]);
  const [ocrPending, startOcr] = useTransition();
  const [pendingAiMode, setPendingAiMode] = useState<
    "standard" | "advanced" | null
  >(null);

  // success early-return 보다 위에 둬야 훅 순서가 깨지지 않음 (등록 직후 탭 크래시 원인)
  useEffect(() => {
    if (success) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, success]);

  const handleQuestionReady = useCallback((ready: boolean) => {
    setQuestionReady(ready);
  }, []);

  function clearAiDrafts() {
    setSharedPassage("");
    setDrafts([]);
    setOcrText("");
    setOcrNote(null);
  }

  function requestOcr(mode: "standard" | "advanced") {
    setEntryChoice("ai");
    setAiQuality(mode);
    setPendingAiMode(mode);
  }

  function runOcr(mode: "standard" | "advanced" = aiQuality) {
    setPendingAiMode(null);
    setError(null);
    clearAiDrafts();
    const preview = questionPages[0]?.preview;
    if (!preview) {
      setError("문제 사진을 먼저 선택해 주세요.");
      return;
    }

    const extraImageDataUrls = questionPages
      .slice(1)
      .map((p) => p.preview)
      .filter(Boolean);

    startOcr(async () => {
      const result = await ocrFromImageAction({
        requestId: crypto.randomUUID(),
        imageDataUrl: preview,
        extraImageDataUrls,
        subjectId: effectiveSubjectId,
        aiMode: mode,
      });
      if (result.used != null) {
        setAiQuota((current) =>
          current
            ? {
                ...current,
                dailyUsed: result.used ?? current.dailyUsed,
                monthlyUsed: result.monthlyUsed ?? current.monthlyUsed,
                advancedUsed: result.advancedUsed ?? current.advancedUsed,
              }
            : current,
        );
      }

      if (result.error) {
        const usedHint =
          result.used != null && result.limit != null
            ? ` (오늘 AI 분석 ${result.used}/${result.limit}회)`
            : "";
        setError(`${result.error}${usedHint}`);
        return;
      }
      const data = result.result;
      if (!data) return;

      const problems =
        data.problems && data.problems.length > 0
          ? data.problems
          : data.problemLatex
            ? [
                {
                  number: "",
                  problemLatex: data.problemLatex,
                  answerGuess: data.answerGuess,
                  keywords: data.keywords,
                  figures: [],
                },
              ]
            : [];

      if (problems.length === 0) {
        setError(
          "AI가 문제를 읽지 못했어요. 사진을 다시 확인해 주세요. AI 분석 1회는 이미 사용됐어요.",
        );
        return;
      }

      setSharedPassage(data.sharedPassage?.trim() ?? "");
      setOcrText(data.rawText?.trim() ?? "");
      const imageSources = [preview, ...extraImageDataUrls];
      const nextDrafts = await Promise.all(
        problems.map(async (p) => ({
          id: nextDraftId(),
          selected: true,
          number: p.number ?? "",
          bodyLatex: p.problemLatex,
          answerText: "",
          keywords: p.keywords ?? [],
          figureDataUrls: await cropExtractedFigures(
            imageSources,
            p.figures ?? [],
          ),
          editing: false,
        })),
      );
      setDrafts(nextDrafts);

      const mergedKeywords = problems.flatMap((p) => p.keywords ?? []);
      if (mergedKeywords.length > 0) {
        setKeywords((prev) => {
          const next = [...prev];
          for (const k of mergedKeywords) {
            if (!next.includes(k)) next.push(k);
          }
          return next.slice(0, 12);
        });
      }

      // 정답은 학생이 직접 입력 (AI가 채우지 않음)
      setAnswerText("");

      const dailyHint =
        result.limit != null && result.used != null
          ? `오늘 AI 분석 ${result.used}/${result.limit}회`
          : "";
      const monthlyHint =
        result.monthlyLimit != null && result.monthlyUsed != null
          ? `이번 달 ${result.monthlyUsed}/${result.monthlyLimit}회`
          : "";
      const splitHint =
        problems.length > 1
          ? `문제 ${problems.length}개로 나눴어요. 등록할 문항만 고르고 정답은 직접 입력해 주세요.`
          : data.note || "문제를 정리했어요. 정답은 직접 입력해 주세요.";
      const quotaHint =
        dailyHint || monthlyHint
          ? ` (${[dailyHint, monthlyHint].filter(Boolean).join(" · ")})`
          : "";
      setOcrNote(`${splitHint}${quotaHint}`);
    });
  }

  async function uploadIfNeeded(dataUrl: string, kind: "question" | "answer") {
    if (!isSupabaseEnabled() || !dataUrl.startsWith("data:")) {
      return dataUrl;
    }

    try {
      const url = await uploadDataUrl(dataUrl, userId, kind);
      if (url && !url.startsWith("data:")) return url;
    } catch (clientErr) {
      console.warn("[upload] client storage failed, trying server", clientErr);
    }

    const server = await uploadImageAction(dataUrl, kind);
    if (server.url && !server.url.startsWith("data:")) {
      return server.url;
    }
    throw new Error(server.error || "PHOTO_UPLOAD_FAILED");
  }

  async function handleSubmit() {
    if (!effectiveSubjectId) {
      setError("과목을 선택해 주세요.");
      return;
    }

    if (!questionReady || questionPages.length === 0) {
      setError("문제 사진을 먼저 선택해 주세요.");
      return;
    }

    const selectedDrafts = drafts.filter((d) => d.selected);
    const useDrafts = drafts.length > 0;

    if (useDrafts) {
      if (selectedDrafts.length === 0) {
        setError("등록할 문항을 하나 이상 선택해 주세요.");
        return;
      }
      const missing = selectedDrafts.find((d) => !d.answerText.trim());
      if (missing) {
        setError(
          `${missing.number ? `${missing.number}번` : "선택한 문항"}의 정답을 입력해 주세요.`,
        );
        return;
      }
    } else if (!answerText.trim()) {
      setError("정답을 입력해 주세요. (해설 사진은 없어도 돼요)");
      return;
    }

    if (!canPersist(userId)) {
      setError(
        "저장할 수 없습니다. 로그인 상태를 확인하거나 브라우저 저장을 허용해 주세요.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    const saveFailQuotaHint =
      entryChoice === "ai"
        ? " AI 분석 횟수는 이미 사용됐어요. 다시 저장만 하면 추가 차감 없어요."
        : "";

    try {
      const previews = questionPages.map((p) => p.preview);
      const [mainPreview, ...extraPreviews] = previews;

      // 사진은 먼저 Storage에 올리고, 서버 액션에는 URL만 보냅니다 (용량 초과·탭 크래시 방지)
      const imageDataUrl = await uploadIfNeeded(mainPreview!, "question");
      let extraImageDataUrls: string[] | undefined;
      if (extraPreviews.length > 0) {
        extraImageDataUrls = await Promise.all(
          extraPreviews.map((url) => uploadIfNeeded(url, "question")),
        );
      }

      let answerImageDataUrl: string | undefined;
      let extraAnswerImageDataUrls: string[] | undefined;
      if (answerPages.length > 0) {
        const answerPreviews = answerPages.map((p) => p.preview);
        const [mainAnswer, ...extraAnswers] = answerPreviews;
        answerImageDataUrl = await uploadIfNeeded(mainAnswer!, "answer");
        if (extraAnswers.length > 0) {
          extraAnswerImageDataUrls = await Promise.all(
            extraAnswers.map((url) => uploadIfNeeded(url, "answer")),
          );
        }
      }

      const base = {
        subjectId: effectiveSubjectId,
        imageDataUrl,
        extraImageDataUrls,
        answerImageDataUrl,
        extraAnswerImageDataUrls,
        source: source.trim() || undefined,
        wrongReason: wrongReason || undefined,
        wrongKeywords,
        wrongReasonDetail:
          wrongKeywords.length > 0 ? wrongKeywords.join(", ") : undefined,
        reflectionMemo: encodeSolveConfidenceMemo(
          solveConfidence,
          reflectionMemo,
        ),
      };

      const toSave = useDrafts
        ? await Promise.all(
            selectedDrafts.map(async (d) => {
              const figureUrls = await Promise.all(
                d.figureDataUrls.map((url) =>
                  uploadIfNeeded(url, "question"),
                ),
              );
              return {
                ...base,
                problemLatex: composeProblemLatex(
                  sharedPassage,
                  embedProblemFigures(d.bodyLatex, figureUrls),
                ),
                sharedPassage: sharedPassage.trim() || undefined,
                ocrText,
                entryMode: "ai" as const,
                answerText: normalizeAnswerText(d.answerText.trim()),
                keywords:
                  d.keywords.length > 0
                    ? d.keywords
                    : keywords.length > 0
                      ? keywords
                      : [],
              };
            }),
          )
        : [
            {
              ...base,
              problemLatex: undefined,
              ocrText: undefined,
              entryMode: "manual" as const,
              answerText: normalizeAnswerText(answerText.trim()),
              keywords,
            },
          ];

      if (isSupabaseEnabled()) {
        saveRequestIdRef.current ??= crypto.randomUUID();
        const result = await saveQuestionsBatchAction({
          requestId: saveRequestIdRef.current,
          questions: toSave,
        });
        if (result.error) {
          setError(`${result.error}${saveFailQuotaHint}`);
          return;
        }
      } else {
        for (const payload of toSave) {
          await saveQuestion(userId, {
            ...payload,
            userId,
          });
        }
      }

      const allKeywords = [
        ...new Set(toSave.flatMap((p) => p.keywords ?? [])),
      ];
      if (allKeywords.length > 0) {
        void recordKeywordUsage(userId, "problem", allKeywords);
      }
      if (wrongKeywords.length > 0) {
        void recordKeywordUsage(userId, "wrong", wrongKeywords);
      }

      saveRequestIdRef.current = null;
      const count = toSave.length;
      // 큰 data URL을 메모리에서 비운 뒤 완료 화면 (모바일 탭 크래시 완화)
      setQuestionPages([]);
      setQuestionReady(false);
      clearAiDrafts();
      setAnswerPages([]);
      setRegisteredCount(count);
      setSuccess(true);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError(`${err.message}${saveFailQuotaHint}`);
      } else if (err instanceof StorageBlockedError) {
        setError(`${err.message}${saveFailQuotaHint}`);
      } else {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("ANSWER_TEXT_REQUIRED")) {
          setError("정답을 입력해 주세요. (해설 사진은 없어도 돼요)");
        } else if (
          msg.includes("PHOTO_UPLOAD_FAILED") ||
          msg.includes("업로드")
        ) {
          setError(
            `사진을 올리지 못했어요. 네트워크를 확인한 뒤 다시 등록해 주세요.${saveFailQuotaHint}`,
          );
        } else {
          setError(
            `등록에 실패했어요. 같은 내용으로 다시 저장해 보세요.${saveFailQuotaHint}`,
          );
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleContinue() {
    setSuccess(false);
    setStep(1);
    setEntryChoice(null);
    setAiQuality(aiQuota?.preferAdvanced ? "advanced" : "standard");
    clearAiDrafts();
    setQuestionPages([]);
    setQuestionReady(false);
    setAnswerPages([]);
    setAnswerText("");
    setKeywords([]);
    setSource("");
    setWrongReason("");
    setWrongKeywords([]);
    setReflectionMemo("");
  }

  if (success) {
    return (
      <div className="remind-card space-y-3 p-4 text-center">
        <p className="text-4xl" aria-hidden>
          ✅
        </p>
        <p className="text-xl font-bold text-[var(--rm-text-on-success)]">
          등록 완료!
        </p>
        <p className="text-sm text-[var(--rm-text-on-success)]">
          {getSubjectName(effectiveSubjectId)}에 저장됐어요
          {registeredCount > 1 ? ` · 이번에 ${registeredCount}개` : ""}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[48px] rounded-xl bg-[var(--rm-brand)] py-2.5 text-sm font-bold text-white"
          >
            계속 등록
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="min-h-[48px] rounded-xl border border-[var(--rm-border)] py-2.5 text-sm font-bold text-[var(--rm-text)]"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const selectedDrafts = drafts.filter((d) => d.selected);
  const useDrafts = drafts.length > 0;
  const canContinueStep1 =
    Boolean(effectiveSubjectId) && questionReady && questionPages.length > 0;
  const canContinueStep2 =
    entryChoice === "ai"
      ? useDrafts &&
        selectedDrafts.length > 0 &&
        selectedDrafts.every((draft) => draft.answerText.trim().length > 0)
      : entryChoice === "manual"
        ? answerText.trim().length > 0
        : false;
  const canSubmit = canContinueStep1 && canContinueStep2;
  const isPremium = aiQuota?.planCode === "premium";
  const dailyRemaining = Math.max(
    0,
    (aiQuota?.dailyLimit ?? 0) - (aiQuota?.dailyUsed ?? 0),
  );
  const monthlyRemaining = Math.max(
    0,
    (aiQuota?.monthlyLimit ?? 0) - (aiQuota?.monthlyUsed ?? 0),
  );
  const advancedRemaining = Math.max(
    0,
    (aiQuota?.advancedLimit ?? 0) - (aiQuota?.advancedUsed ?? 0),
  );

  return (
    <div className="space-y-3">
      <ConfirmDialog
        open={pendingAiMode !== null}
        title="AI 정리를 시작할까요?"
        description={
          pendingAiMode === "advanced"
            ? "오늘 AI 분석 1회를 사용합니다.\n정밀 AI도 함께 쓰일 수 있어요.\n문제는 정리해 주고, 정답은 직접 입력해요."
            : "오늘 AI 분석 1회를 사용합니다.\n문제는 정리해 주고, 정답은 직접 입력해요."
        }
        confirmLabel="AI 정리 시작"
        cancelLabel="취소"
        onConfirm={() => {
          if (pendingAiMode) runOcr(pendingAiMode);
        }}
        onCancel={() => setPendingAiMode(null)}
      />

      {error ? (
        <p className="rounded-xl bg-[var(--rm-error-bg)] px-3 py-2.5 text-sm font-medium text-[var(--rm-text-on-error)]">
          {error}
        </p>
      ) : null}

      <section className="remind-card sticky top-14 z-20 border border-[var(--rm-border)] bg-[var(--rm-surface)]/95 p-3.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-[var(--rm-surface)]/90">
        <div className="grid grid-cols-4 gap-2" aria-label="등록 진행 단계">
          {[
            ["1", "사진"],
            ["2", "정답"],
            ["3", "추가"],
            ["4", "완료"],
          ].map(([number, label], index) => {
            const itemStep = (index + 1) as 1 | 2 | 3 | 4;
            const active = itemStep === step;
            const done = itemStep < step;
            return (
              <div key={number} className="min-w-0 text-center">
                <div
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    active || done
                      ? "bg-[var(--rm-brand)] text-white"
                      : "bg-[var(--rm-surface-raised)] text-[var(--rm-text-muted)]"
                  }`}
                >
                  {done ? "✓" : number}
                </div>
                <p
                  className={`mt-1 truncate text-[10px] font-semibold ${
                    active
                      ? "text-[var(--rm-brand)]"
                      : "text-[var(--rm-text-muted)]"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {step === 1 ? (
        <section className="remind-card space-y-4 p-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--rm-text)]">
              1단계 · 문제 사진
            </h2>
            <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
              한 번에 문제 하나만, 세로로 반듯하게 찍어 주세요.
            </p>
          </div>

          <PhotoTips />

          <label className="block">
            <span className="remind-field-label">과목</span>
            {subjectsLoading ? (
              <p className="mt-1 text-sm text-[var(--rm-text-muted)]">
                과목 불러오는 중...
              </p>
            ) : subjects.length === 0 ? (
              <div className="mt-1 space-y-2">
                <p className="text-sm text-[var(--rm-danger)]">
                  과목이 없어요. 먼저 과목을 추가해 주세요.
                </p>
                <Link
                  href="/subjects"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--rm-border)] px-4 text-sm font-semibold text-[var(--rm-nav-active)]"
                >
                  과목 설정으로 가기 →
                </Link>
              </div>
            ) : (
              <select
                value={effectiveSubjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="remind-input mt-1 text-base"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          <MultiImagePicker
            label="문제 사진"
            hint="촬영·앨범 후 완료 전에 돌리기·자르기를 할 수 있어요"
            required
            maxImages={5}
            onReadyChange={handleQuestionReady}
            onChange={(pages) => {
              setQuestionPages(pages);
              clearAiDrafts();
              setAnswerText("");
              setEntryChoice(null);
            }}
          />

          <button
            type="button"
            data-tour-id="student-upload-next"
            disabled={!canContinueStep1}
            onClick={() => setStep(2)}
            className="min-h-[48px] w-full rounded-xl bg-[var(--rm-brand)] py-3 text-base font-bold text-white disabled:opacity-40"
          >
            다음
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="remind-card space-y-4 p-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--rm-text)]">
              2단계 · 정답 입력
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--rm-text-muted)]">
              정답은 직접 입력해요. 원하면 AI로 문제 글자·수식만 읽기 좋게 정리할 수
              있어요(정답은 풀어 주지 않아요).
            </p>
          </div>

          {aiQuota ? (
            <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
              <p className="text-xs font-bold text-[var(--rm-text)]">
                오늘 AI 분석 {dailyRemaining}회 남음
              </p>
              <p className="mt-1 text-[11px] text-[var(--rm-text-muted)]">
                이번 달 {monthlyRemaining}회 남음
                {isPremium
                  ? ` · 정밀 AI ${advancedRemaining}회 남음`
                  : ""}
              </p>
              <p className="mt-1.5 text-[11px] leading-4 text-[var(--rm-text-muted)]">
                AI 정리 1번 = 분석 1회예요. 사진 장수·문제 개수와는 상관없어요.
              </p>
            </div>
          ) : null}

          <div className={`grid gap-2 ${isPremium ? "sm:grid-cols-3" : "grid-cols-2"}`}>
            <button
              type="button"
              disabled={ocrPending}
              onClick={() => {
                setEntryChoice("manual");
                clearAiDrafts();
              }}
              className={`min-h-[76px] rounded-xl border p-3 text-left disabled:opacity-60 ${
                entryChoice === "manual"
                  ? "border-[var(--rm-brand)] bg-[var(--rm-info-bg)]"
                  : "border-[var(--rm-border)] bg-[var(--rm-surface)]"
              }`}
            >
              <span className="block text-sm font-bold">정답만 입력</span>
              <span className="mt-1 block text-[11px] text-[var(--rm-text-muted)]">
                사진 그대로 · AI 없음
              </span>
            </button>
            <button
              type="button"
              onClick={() => requestOcr("standard")}
              disabled={ocrPending}
              className={`min-h-[76px] rounded-xl border p-3 text-left disabled:opacity-60 ${
                entryChoice === "ai" && aiQuality === "standard"
                  ? "border-[var(--rm-brand)] bg-[var(--rm-info-bg)]"
                  : "border-[var(--rm-border)] bg-[var(--rm-surface)]"
              }`}
            >
              <span className="block text-sm font-bold">
                {ocrPending &&
                entryChoice === "ai" &&
                aiQuality === "standard"
                  ? "정리 중…"
                  : "빠른 AI 정리"}
              </span>
              <span className="mt-1 block text-[11px] text-[var(--rm-text-muted)]">
                문제 글자·수식 정리 · 1회 · 정답은 직접
              </span>
            </button>
            {isPremium ? (
              <button
                type="button"
                onClick={() => requestOcr("advanced")}
                disabled={ocrPending || advancedRemaining <= 0}
                className={`min-h-[76px] rounded-xl border p-3 text-left disabled:opacity-50 ${
                  entryChoice === "ai" && aiQuality === "advanced"
                    ? "border-violet-500 bg-violet-50"
                    : "border-[var(--rm-border)] bg-[var(--rm-surface)]"
                }`}
              >
                <span className="block text-sm font-bold">
                  {ocrPending &&
                  entryChoice === "ai" &&
                  aiQuality === "advanced"
                    ? "정밀하게 읽는 중…"
                    : "정밀 AI 정리"}
                </span>
                <span className="mt-1 block text-[11px] text-[var(--rm-text-muted)]">
                  {advancedRemaining > 0
                    ? "깊게 정리 · 1회 · 정답은 직접"
                    : "이번 달 정밀 AI를 모두 썼어요"}
                </span>
              </button>
            ) : null}
          </div>

          {entryChoice === "manual" ? (
            <AnswerMathInput
              value={answerText}
              onChange={setAnswerText}
              required
              showMathTools={mathTools}
              placeholder={
                mathTools ? "예: ③ · 분수·로그·루트 버튼 사용" : "예: ③ 또는 x=2"
              }
            />
          ) : null}

          {entryChoice === "ai" ? (
            <>
              {ocrNote ? (
                <p className="text-xs text-[var(--rm-text-muted)]">{ocrNote}</p>
              ) : null}
              <ProblemDraftList
                sharedPassage={sharedPassage}
                drafts={drafts}
                onChange={setDrafts}
                onSharedPassageChange={setSharedPassage}
                showMathTools={mathTools}
              />
              {!ocrPending && drafts.length === 0 ? (
                <button
                  type="button"
                  onClick={() => requestOcr(aiQuality)}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--rm-border)] text-sm font-semibold"
                >
                  AI 정리 다시 시도 (1회 추가 사용)
                </button>
              ) : null}
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[46px] rounded-xl border border-[var(--rm-border)] font-semibold"
            >
              이전
            </button>
            <button
              type="button"
              disabled={!canContinueStep2 || ocrPending}
              onClick={() => setStep(3)}
              className="min-h-[46px] rounded-xl bg-[var(--rm-brand)] font-bold text-white disabled:opacity-40"
            >
              다음 · 추가 내용
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="remind-card space-y-3 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--rm-text)]">
                3단계 · 추가 내용
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--rm-nav-active)]">
                다 건너뛰어도 돼요
              </p>
              <p className="mt-0.5 text-xs text-[var(--rm-text-muted)]">
                키워드·출처·메모는 나중에 찾기 쉬울 때만 적어도 됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="shrink-0 rounded-lg border border-[var(--rm-brand)] bg-[var(--rm-info-bg)] px-3 py-1.5 text-xs font-bold text-[var(--rm-nav-active)]"
            >
              건너뛰기
            </button>
          </div>
          <KeywordPicker
            userId={userId}
            kind="problem"
            selected={keywords}
            onChange={setKeywords}
            label="문제 키워드"
            hint="단원·유형 등 (나중에 찾아보기 쉬워요)"
            placeholder="예: 이차함수"
          />

          <label className="block">
            <span className="rm-field-hint">문제 출처</span>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="예: 6월 모평 22번"
              className="remind-input mt-1 text-base"
            />
          </label>

          <WrongReasonFields
            userId={userId}
            wrongReason={wrongReason}
            wrongKeywords={wrongKeywords}
            onWrongReasonChange={setWrongReason}
            onWrongKeywordsChange={setWrongKeywords}
            solveConfidence={solveConfidence}
            onSolveConfidenceChange={setSolveConfidence}
          />

          <label className="block">
            <span className="rm-field-hint">오답 메모</span>
            <textarea
              rows={3}
              value={reflectionMemo}
              onChange={(e) => setReflectionMemo(e.target.value)}
              placeholder="왜 틀렸는지 짧게"
              className="remind-input mt-1 text-base"
            />
          </label>

          <MultiImagePicker
            label="해설 사진"
            hint="없어도 돼요 · 촬영·앨범 후 돌리기·자르기 가능 · 여러 장 OK (수식 변환 없음)"
            maxImages={5}
            onChange={setAnswerPages}
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[46px] rounded-xl border border-[var(--rm-border)] font-semibold"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="min-h-[46px] rounded-xl bg-[var(--rm-brand)] font-bold text-white"
            >
              다음 · 확인
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="remind-card space-y-4 p-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--rm-text)]">
              4단계 · 확인하고 완료
            </h2>
            <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
              저장하면 내 보관함·다시 풀기에 바로 반영돼요.
            </p>
          </div>

          <dl className="space-y-2 rounded-xl bg-[var(--rm-surface-raised)] p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">과목</dt>
              <dd className="font-semibold">{getSubjectName(effectiveSubjectId)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">사진</dt>
              <dd className="font-semibold">{questionPages.length}장</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">해설 사진</dt>
              <dd className="font-semibold">
                {answerPages.length > 0 ? `${answerPages.length}장` : "없음"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">입력 방식</dt>
              <dd className="font-semibold">
                {entryChoice === "ai" ? "AI 정리" : "정답만 입력"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">등록 문항</dt>
              <dd className="font-semibold">
                {useDrafts ? selectedDrafts.length : 1}개
              </dd>
            </div>
            {source ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--rm-text-muted)]">출처</dt>
                <dd className="text-right font-semibold">{source}</dd>
              </div>
            ) : null}
          </dl>

          {entryChoice === "ai" ? (
            <p className="rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-3 py-2 text-[11px] leading-4 text-[var(--rm-text-on-info)]">
              AI 분석은 2단계에서 이미 사용됐어요. 여기서 등록이 실패해도
              횟수가 더 깎이지 않으니, 같은 내용으로 다시 저장해 보세요.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="min-h-[48px] rounded-xl border border-[var(--rm-border)] font-semibold"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving || !canSubmit}
              className="min-h-[48px] rounded-xl bg-[var(--rm-brand)] text-base font-bold text-white disabled:opacity-40"
            >
              {isSaving
                ? "등록 중..."
                : useDrafts && selectedDrafts.length > 1
                  ? `${selectedDrafts.length}개 등록하기`
                  : "등록하기"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** 사진 인식·정답 품질을 올리는 촬영 가이드 — 기본은 접힘 */
function PhotoTips() {
  return (
    <details className="group rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] open:pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-[var(--rm-text)] [&::-webkit-details-marker]:hidden">
        <span>문제 잘 찍는 꿀팁 (꼭 읽어주세요)</span>
        <span className="text-xs text-[var(--rm-text-muted)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid gap-1.5 px-3 pb-1 text-xs leading-5 text-[var(--rm-text-on-info)]">
        <p className="font-semibold">
          아래를 지키면 문제 인식이 더 잘 돼요.
        </p>
        <p>
          ✅ <strong>한 문제에 한 장</strong>만 찍어요. 여러 문항이 한
          장에 있으면 틀리거나 못 읽을 수 있어요.
        </p>
        <p>
          ✅ <strong>세로로 반듯하게</strong> 찍어요. 옆으로 찍었으면
          완료 전에 「돌리기」로 세워 주세요.
        </p>
        <p>✅ 밝은 곳에서, 문제가 화면에 꽉 차게 · 글자가 또렷하게.</p>
        <p className="text-[var(--rm-text-muted)]">
          ❌ 여러 문제 한 장 · 가로로 누운 사진 · 흐리거나 어두운 사진
        </p>
      </div>
    </details>
  );
}
