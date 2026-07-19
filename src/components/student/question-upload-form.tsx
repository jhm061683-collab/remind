"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ocrFromImageAction } from "@/lib/actions/ocr";
import { saveQuestionAction } from "@/lib/actions/questions";
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

type Props = {
  userId: string;
  defaultSubjectId?: string;
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

export function QuestionUploadForm({ userId, defaultSubjectId }: Props) {
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
  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
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
    setOcrNote(null);
  }

  function runOcr() {
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
        imageDataUrl: preview,
        extraImageDataUrls,
        subjectId,
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
                },
              ]
            : [];

      if (problems.length === 0) {
        setError("AI가 문제를 읽지 못했어요. 사진을 다시 확인해 주세요.");
        return;
      }

      setSharedPassage(data.sharedPassage?.trim() ?? "");
      setDrafts(
        problems.map((p) => ({
          id: nextDraftId(),
          selected: true,
          number: p.number ?? "",
          bodyLatex: p.problemLatex,
          answerText: p.answerGuess ?? "",
          keywords: p.keywords ?? [],
          editing: false,
        })),
      );

      const mergedKeywords = problems.flatMap((p) => p.keywords ?? []);
      if (mergedKeywords.length > 0) {
        setKeywords((prev) => {
          const next = [...prev];
          for (const k of mergedKeywords) {
            if (!next.includes(k)) next.push(k);
          }
          return next.slice(0, 12);
        });
        setShowExtras(true);
      }

      // 문항이 하나면 기존 정답 칸과도 맞춤 (수동 등록 흐름 호환)
      if (problems.length === 1) {
        setAnswerText(problems[0]!.answerGuess || "");
      }

      const engineLabel =
        result.engine === "gpt-4o"
          ? "GPT-4o"
          : result.engine === "gemini-3.5-flash"
            ? "Gemini 3.5 Flash"
            : "";
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
          (engineLabel ? ` · ${engineLabel}` : "") +
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
        ? selectedDrafts.map((d) => ({
            ...base,
            problemLatex: composeProblemLatex(sharedPassage, d.bodyLatex),
            answerText: d.answerText.trim(),
            keywords:
              d.keywords.length > 0
                ? d.keywords
                : keywords.length > 0
                  ? keywords
                  : [],
          }))
        : [
            {
              ...base,
              problemLatex: undefined,
              answerText: answerText.trim(),
              keywords,
            },
          ];

      for (const payload of toSave) {
        if (isSupabaseEnabled()) {
          const result = await saveQuestionAction(payload);
          if (result.error) {
            setError(result.error);
            return;
          }
        } else {
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
    setShowExtras(false);
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
  const canSubmit =
    Boolean(subjectId) &&
    questionReady &&
    questionPages.length > 0 &&
    (useDrafts
      ? selectedDrafts.length > 0 &&
        selectedDrafts.every((d) => d.answerText.trim().length > 0)
      : answerText.trim().length > 0);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-[var(--rm-error-bg)] px-3 py-2.5 text-sm font-medium text-[var(--rm-text-on-error)]">
          {error}
        </p>
      ) : null}

      <section className="remind-card space-y-3 p-3.5">
        <p className="text-xs font-semibold text-[var(--rm-text-muted)]">
          필수 · 3가지만 하면 돼요
        </p>

        <label className="block">
          <span className="remind-field-label">1. 과목</span>
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
              onChange={(e) => setSubjectId(e.target.value)}
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

        <div>
          <p className="remind-field-label mb-1">2. 문제 사진</p>
          <MultiImagePicker
            label=""
            hint="최대 5장 · 한 장에 여러 문항이 있으면 AI가 나눠 줘요"
            required
            maxImages={5}
            onReadyChange={handleQuestionReady}
            onChange={(pages) => {
              setQuestionPages(pages);
              clearAiDrafts();
              setAnswerText("");
            }}
          />
          {questionReady && questionPages.length > 0 ? (
            <button
              type="button"
              onClick={runOcr}
              disabled={ocrPending}
              className="mt-2 min-h-[44px] w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 text-sm font-semibold text-[var(--rm-text)] touch-manipulation disabled:opacity-60"
            >
              {ocrPending
                ? "AI 분석 중…"
                : "AI로 읽기 (여러 문항이면 자동 분리)"}
            </button>
          ) : null}
          {ocrNote ? (
            <p className="mt-1.5 text-xs text-[var(--rm-text-muted)]">{ocrNote}</p>
          ) : null}

          <ProblemDraftList
            sharedPassage={sharedPassage}
            drafts={drafts}
            onChange={setDrafts}
            onSharedPassageChange={setSharedPassage}
          />
        </div>

        {!useDrafts ? (
          <label className="block">
            <span className="remind-field-label">
              3. 정답 <span className="text-[var(--rm-danger)]">*</span>
            </span>
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="예: ③ 또는 x=2"
              className="remind-input mt-1 text-base"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
              AI로 읽으면 문항별로 정답을 입력할 수 있어요.
            </p>
          </label>
        ) : (
          <p className="text-xs text-[var(--rm-text-muted)]">
            3. 정답은 위에서 선택한 문항마다 입력해 주세요.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => setShowExtras((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-dashed border-[var(--rm-border)] bg-[var(--rm-surface)] px-3.5 py-2 text-left text-sm font-medium text-[var(--rm-text-muted)] touch-manipulation"
      >
        <span>{showExtras ? "추가입력 접기" : "추가입력"}</span>
        <span className="text-xs text-[var(--rm-text-faint)]">
          키워드 · 오답 메모 · 해설 사진
        </span>
      </button>

      {showExtras ? (
        <section className="remind-card space-y-3 p-3.5">
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
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isSaving || !canSubmit}
        className={`min-h-[48px] w-full rounded-xl py-3 text-base font-bold text-white touch-manipulation ${
          canSubmit ? "bg-[var(--rm-brand)]" : "bg-[var(--rm-text-faint)]"
        }`}
      >
        {isSaving
          ? "등록 중..."
          : canSubmit
            ? useDrafts && selectedDrafts.length > 1
              ? `${selectedDrafts.length}개 등록하기`
              : "등록하기"
            : useDrafts
              ? selectedDrafts.length === 0
                ? "등록할 문항을 선택하세요"
                : "선택한 문항의 정답을 입력하세요"
              : !answerText.trim()
                ? "정답을 입력하세요"
                : "사진과 과목을 선택하세요"}
      </button>
    </div>
  );
}
