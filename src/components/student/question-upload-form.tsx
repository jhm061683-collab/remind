"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { WrongReasonFields } from "@/components/student/wrong-reason-fields";
import {
  fileOrPreviewToDataUrl,
} from "@/lib/utils/compress-image";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { parseKeywords } from "@/lib/utils/keywords";

type Props = {
  userId: string;
  defaultSubjectId?: string;
};

function canPersist(userId: string): boolean {
  if (!userId || userId === "guest") return false;
  if (isSupabaseEnabled()) return true;
  return isLocalStorageAvailable();
}

function resetFormFields(setters: {
  setQuestionPages: (v: ImagePage[]) => void;
  setQuestionReady: (v: boolean) => void;
  setAnswerFile: (v: File | null) => void;
  setAnswerPreview: (v: string | null) => void;
  setAnswerText: (v: string) => void;
  setKeywordInput: (v: string) => void;
  setSource: (v: string) => void;
  setWrongReason: (v: string) => void;
  setWrongReasonDetail: (v: string) => void;
  setReflectionMemo: (v: string) => void;
}) {
  setters.setQuestionPages([]);
  setters.setQuestionReady(false);
  setters.setAnswerFile(null);
  setters.setAnswerPreview(null);
  setters.setAnswerText("");
  setters.setKeywordInput("");
  setters.setSource("");
  setters.setWrongReason("");
  setters.setWrongReasonDetail("");
  setters.setReflectionMemo("");
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
  const [keywordInput, setKeywordInput] = useState("");
  const [source, setSource] = useState("");
  const [wrongReason, setWrongReason] = useState("");
  const [wrongReasonDetail, setWrongReasonDetail] = useState("");
  const [reflectionMemo, setReflectionMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);

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

      const payload = {
        subjectId,
        imageDataUrl,
        extraImageDataUrls,
        answerText: answerText.trim() || undefined,
        answerImageDataUrl,
        keywords: parseKeywords(keywordInput),
        source: source.trim() || undefined,
        wrongReason: wrongReason || undefined,
        wrongReasonDetail: wrongReasonDetail.trim() || undefined,
        reflectionMemo: reflectionMemo.trim() || undefined,
      };

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

      setRegisteredCount((c) => c + 1);
      setSuccess(true);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setError(err.message);
      } else if (err instanceof StorageBlockedError) {
        setError(err.message);
      } else {
        setError("등록 실패. 사진을 다시 선택해 주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleContinue() {
    setSuccess(false);
    resetFormFields({
      setQuestionPages,
      setQuestionReady,
      setAnswerFile,
      setAnswerPreview,
      setAnswerText,
      setKeywordInput,
      setSource,
      setWrongReason,
      setWrongReasonDetail,
      setReflectionMemo,
    });
  }

  if (success) {
    return (
      <div className="remind-card space-y-4 p-8 text-center">
        <p className="text-4xl">✅</p>
        <p className="text-xl font-bold text-green-800">등록 완료!</p>
        <p className="text-sm text-green-700">
          {getSubjectName(subjectId)}에 저장됐어요
          {registeredCount > 1 ? ` · 이번에 ${registeredCount}개` : ""}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[48px] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"
          >
            계속 등록
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="min-h-[48px] rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = Boolean(subjectId) && questionReady && questionPages.length > 0;

  return (
    <div className="remind-card space-y-4 p-5 md:p-6">
      {error ? (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="remind-field-label">과목</span>
        {subjectsLoading ? (
          <p className="mt-1 text-sm text-slate-500">과목 불러오는 중...</p>
        ) : subjects.length === 0 ? (
          <p className="mt-1 text-sm text-red-600">
            과목이 없어요. 「과목 설정」에서 과목을 먼저 추가해 주세요.
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

      <MultiImagePicker
        label={UI_LABELS.registerPhoto}
        hint={UI_LABELS.registerPhotoHint}
        required
        onReadyChange={handleQuestionReady}
        onChange={setQuestionPages}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">키워드 (검색용)</label>
        <input
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="예: 이차함수, 3번"
          className="remind-input text-base"
        />
      </div>

      <div className="rm-analysis-panel space-y-3">
        <p className="text-sm font-bold">오답 분석</p>
        <label className="block">
          <span className="rm-field-hint">문제 출처 (선택)</span>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="예: 26년 6월 모평 22번"
            className="remind-input mt-1 text-base"
          />
        </label>
        <WrongReasonFields
          userId={userId}
          wrongReason={wrongReason}
          wrongReasonDetail={wrongReasonDetail}
          onWrongReasonChange={setWrongReason}
          onWrongReasonDetailChange={setWrongReasonDetail}
        />
        <label className="block">
          <span className="rm-field-hint">오답 분석 메모</span>
          <textarea
            rows={4}
            value={reflectionMemo}
            onChange={(e) => setReflectionMemo(e.target.value)}
            placeholder="무엇을 몰라서 틀렸는지 적어 보세요."
            className="remind-input mt-1 text-base"
          />
        </label>
      </div>

      <div className="rm-solution-panel space-y-3">
        <p className="text-sm font-bold">해설 (선택)</p>
        <ImagePicker
          label="해설 사진"
          onChange={(file, preview) => {
            setAnswerFile(file);
            setAnswerPreview(preview);
          }}
        />
        <textarea
          rows={2}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="정답/해설 텍스트"
          className="remind-input text-base"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSaving || !canSubmit}
        className={`min-h-[56px] w-full rounded-xl py-4 text-base font-bold text-white touch-manipulation ${
          canSubmit ? "bg-blue-600" : "bg-zinc-400"
        }`}
      >
        {isSaving ? "등록 중..." : canSubmit ? "등록하기" : "사진과 과목을 선택하세요"}
      </button>
    </div>
  );
}
