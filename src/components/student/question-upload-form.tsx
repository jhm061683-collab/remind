"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ocrFromImageAction } from "@/lib/actions/ocr";
import { saveQuestionsBatchAction } from "@/lib/actions/questions";
import {
  MultiImagePicker,
  type ImagePage,
} from "@/components/student/multi-image-picker";
import { ImagePicker } from "@/components/student/image-picker";
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
import { fileOrPreviewToDataUrl } from "@/lib/utils/compress-image";
import { recordKeywordUsage } from "@/lib/data/keyword-library";
import {
  ProblemDraftList,
  type ProblemDraft,
} from "@/components/student/problem-draft-list";
import { composeProblemLatex } from "@/lib/utils/problem-latex";
import type { StudentAiQuotaStatus } from "@/lib/server/ai/engine-quota";
import {
  cropExtractedFigures,
  embedProblemFigures,
} from "@/lib/utils/problem-figures";

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
  const [questionPages, setQuestionPages] = useState<ImagePage[]>([]);
  const [questionReady, setQuestionReady] = useState(false);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerPreview, setAnswerPreview] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [wrongReason, setWrongReason] = useState("");
  const [wrongKeywords, setWrongKeywords] = useState<string[]>([]);
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

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      const preferred = defaultSubjectId
        ? subjects.find((s) => s.id === defaultSubjectId)?.id
        : undefined;
      setSubjectId(preferred ?? subjects[0].id);
    }
  }, [subjects, subjectId, defaultSubjectId]);

  const handleQuestionReady = useCallback((ready: boolean) => {
    setQuestionReady(ready);
  }, []);

  function clearAiDrafts() {
    setSharedPassage("");
    setDrafts([]);
    setOcrText("");
    setOcrNote(null);
  }

  function runOcr(mode: "standard" | "advanced" = aiQuality) {
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
        subjectId,
        aiMode: mode,
      });
      if (result.error) {
        setError(result.error);
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
        setError("AI가 문제를 읽지 못했어요. 사진을 다시 확인해 주세요.");
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
          answerText: p.answerGuess ?? "",
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

      // 문항이 하나면 기존 정답 칸과도 맞춤 (수동 등록 흐름 호환)
      if (problems.length === 1) {
        setAnswerText(problems[0]!.answerGuess || "");
      }

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
      const dailyHint =
        result.limit != null && result.used != null
          ? `오늘 ${result.used}/${result.limit}`
          : "";
      const monthlyHint =
        result.monthlyLimit != null && result.monthlyUsed != null
          ? `이번 달 ${result.monthlyUsed}/${result.monthlyLimit}`
          : "";
      const quotaHint =
        dailyHint || monthlyHint
          ? ` (${[dailyHint, monthlyHint].filter(Boolean).join(" · ")})`
          : "";
      setOcrNote(
        (data.note || "인식 결과를 확인해 주세요.") +
          quotaHint,
      );
    });
  }

  async function uploadIfNeeded(dataUrl: string, kind: "question" | "answer") {
    if (!isSupabaseEnabled() || !dataUrl.startsWith("data:")) {
      return dataUrl;
    }

    try {
      return await uploadDataUrl(dataUrl, userId, kind);
    } catch (clientErr) {
      console.warn("[upload] client storage failed, trying server", clientErr);
      return dataUrl;
    }
  }

  async function handleSubmit() {
    if (!subjectId) {
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

    try {
      const previews = questionPages.map((p) => p.preview);
      const [mainPreview, ...extraPreviews] = previews;

      let imageDataUrl = await uploadIfNeeded(mainPreview!, "question");
      let extraImageDataUrls: string[] | undefined;
      if (extraPreviews.length > 0) {
        extraImageDataUrls = await Promise.all(
          extraPreviews.map((url) => uploadIfNeeded(url, "question")),
        );
      }

      let answerImageDataUrl: string | undefined;
      if (answerFile || answerPreview) {
        answerImageDataUrl = await fileOrPreviewToDataUrl(
          answerFile,
          answerPreview,
        );
        answerImageDataUrl = await uploadIfNeeded(answerImageDataUrl, "answer");
      }

      const base = {
        subjectId,
        imageDataUrl,
        extraImageDataUrls,
        answerImageDataUrl,
        source: source.trim() || undefined,
        wrongReason: wrongReason || undefined,
        wrongKeywords,
        wrongReasonDetail:
          wrongKeywords.length > 0 ? wrongKeywords.join(", ") : undefined,
        reflectionMemo: reflectionMemo.trim() || undefined,
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
                ocrText,
                entryMode: "ai" as const,
                answerText: d.answerText.trim(),
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
              answerText: answerText.trim(),
              keywords,
            },
          ];

      if (isSupabaseEnabled()) {
        // 응답이 유실되어 사용자가 다시 눌러도 같은 UUID를 재사용해 중복 저장을 막는다.
        saveRequestIdRef.current ??= crypto.randomUUID();
        const result = await saveQuestionsBatchAction({
          requestId: saveRequestIdRef.current,
          questions: toSave,
        });
        if (result.error) {
          setError(result.error);
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
      setRegisteredCount(toSave.length);
      setSuccess(true);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError(err.message);
      } else if (err instanceof StorageBlockedError) {
        setError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("ANSWER_TEXT_REQUIRED")) {
          setError("정답을 입력해 주세요. (해설 사진은 없어도 돼요)");
        } else {
          setError("등록 실패. 사진을 다시 선택해 주세요.");
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
    setAnswerFile(null);
    setAnswerPreview(null);
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
          {getSubjectName(subjectId)}에 저장됐어요
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
    Boolean(subjectId) && questionReady && questionPages.length > 0;
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
      {error ? (
        <p className="rounded-xl bg-[var(--rm-error-bg)] px-3 py-2.5 text-sm font-medium text-[var(--rm-text-on-error)]">
          {error}
        </p>
      ) : null}

      <section className="remind-card p-3.5">
        <div className="grid grid-cols-4 gap-2" aria-label="등록 진행 단계">
          {[
            ["1", "사진"],
            ["2", "정답·AI"],
            ["3", "추가 내용"],
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
              촬영하거나 앨범에서 최대 5장을 선택하세요.
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
              <p className="mt-1 text-sm text-[var(--rm-danger)]">
                과목이 없어요. 「과목 설정」에서 먼저 추가해 주세요.
              </p>
            ) : (
              <select
                value={subjectId}
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
            hint="한 장에 여러 문항이 있어도 AI가 나눌 수 있어요"
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
            disabled={!canContinueStep1}
            onClick={() => setStep(2)}
            className="min-h-[48px] w-full rounded-xl bg-[var(--rm-brand)] py-3 text-base font-bold text-white disabled:opacity-40"
          >
            다음 · 정답 입력 방법 선택
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="remind-card space-y-4 p-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--rm-text)]">
              2단계 · 정답 입력 또는 AI 정리
            </h2>
            <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
              정답만 빠르게 적거나, 문제를 읽기 좋게 정리할 수 있어요.
            </p>
          </div>

          {aiQuota ? (
            <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface-raised)] p-3">
              <p className="text-xs font-bold text-[var(--rm-text)]">
                이번 달 AI 정리 {monthlyRemaining}회 남음
              </p>
              <p className="mt-1 text-[11px] text-[var(--rm-text-muted)]">
                오늘 {dailyRemaining}회 남음
                {isPremium
                  ? ` · 정밀 AI 정리 ${advancedRemaining}회 남음`
                  : ""}
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
                빠르고 AI 비용 없음
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryChoice("ai");
                setAiQuality("standard");
                runOcr("standard");
              }}
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
                문제와 수식을 깔끔하게 정돈
              </span>
            </button>
            {isPremium ? (
              <button
                type="button"
                onClick={() => {
                  setEntryChoice("ai");
                  setAiQuality("advanced");
                  runOcr("advanced");
                }}
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
                    ? "복잡한 문제를 더 깊게 읽고 정돈"
                    : "이번 달 이용량을 모두 사용했어요"}
                </span>
              </button>
            ) : null}
          </div>

          {entryChoice === "manual" ? (
            <label className="block">
              <span className="remind-field-label">
                정답 <span className="text-[var(--rm-danger)]">*</span>
              </span>
              <input
                type="text"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="예: ③ 또는 x=2"
                className="remind-input mt-1 text-base"
                autoComplete="off"
              />
            </label>
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
              />
              {!ocrPending && drafts.length === 0 ? (
                <button
                  type="button"
                  onClick={() => runOcr(aiQuality)}
                  className="min-h-[44px] w-full rounded-xl border border-[var(--rm-border)] text-sm font-semibold"
                >
                  AI 분석 다시 시도
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
              <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
                모두 선택 사항이에요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="shrink-0 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-xs font-bold text-[var(--rm-nav-active)]"
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

          <ImagePicker
            label="해설 사진"
            hint="없어도 등록할 수 있어요"
            onChange={(file, preview) => {
              setAnswerFile(file);
              setAnswerPreview(preview);
            }}
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
              아래 내용으로 저장하고 강사·원장 대시보드에 반영합니다.
            </p>
          </div>

          <dl className="space-y-2 rounded-xl bg-[var(--rm-surface-raised)] p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">과목</dt>
              <dd className="font-semibold">{getSubjectName(subjectId)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">사진</dt>
              <dd className="font-semibold">{questionPages.length}장</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--rm-text-muted)]">입력 방식</dt>
              <dd className="font-semibold">
                {entryChoice === "ai" ? "AI 문제 만들기" : "정답만 입력"}
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
                  ? `${selectedDrafts.length}개 등록 완료`
                  : "등록 완료"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** 사진 실패를 줄이는 컴팩트 촬영 가이드 — 접었다 펼 수 있게 */
function PhotoTips() {
  return (
    <details className="group rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] open:pb-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-[var(--rm-text)] [&::-webkit-details-marker]:hidden">
        <span>사진 잘 찍는 법 (안 읽히면 횟수만 줄어요)</span>
        <span className="text-xs text-[var(--rm-text-muted)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid gap-1.5 px-3 pb-1 text-xs leading-5 text-[var(--rm-text-on-info)]">
        <p>✅ 문제 하나가 화면에 꽉 차게, 반듯하게 찍어요.</p>
        <p>✅ 밝은 곳에서, 그림자와 손가락이 안 들어가게.</p>
        <p>✅ 글자가 또렷하게 보일 때까지 가까이.</p>
        <p className="text-[var(--rm-text-muted)]">
          ❌ 흐릿하거나 기울거나 어두운 사진은 AI가 못 읽어요.
        </p>
      </div>
    </details>
  );
}
