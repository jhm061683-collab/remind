"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { saveUserSubjectsAction } from "@/lib/actions/user-meta";
import { getQuestionCountBySubject } from "@/lib/data/questions";
import {
  getReviewSettings,
  getSettingsShortLabel,
  REVIEW_SETTINGS_UPDATED,
} from "@/lib/data/review-settings";
import {
  createSubjectId,
  saveUserSubjects,
  SUBJECTS_UPDATED,
  type UserSubject,
} from "@/lib/data/user-subjects";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { useSubjects } from "@/components/student/subject-provider";

type Props = {
  userId: string;
};

export function SubjectList({ userId }: Props) {
  const { subjects, refresh: refreshSubjects } = useSubjects();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reviewLabels, setReviewLabels] = useState<Record<string, string>>({});
  const [isUnified, setIsUnified] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserSubject[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextCounts: Record<string, number> = {};
    const nextLabels: Record<string, string> = {};

    for (const subject of subjects) {
      nextCounts[subject.id] = await getQuestionCountBySubject(
        userId,
        subject.id,
      );
      const settings = await getReviewSettings(userId, subject.id);
      nextLabels[subject.id] = getSettingsShortLabel(settings);
    }

    const labels = subjects.map((s) => nextLabels[s.id]);
    setCounts(nextCounts);
    setReviewLabels(nextLabels);
    setIsUnified(labels.every((label) => label === labels[0]));
  }, [subjects, userId]);

  useEffect(() => {
    void refresh();
    function onUpdated() {
      void refresh();
    }
    window.addEventListener(REVIEW_SETTINGS_UPDATED, onUpdated);
    window.addEventListener(SUBJECTS_UPDATED, onUpdated);
    window.addEventListener("focus", onUpdated);
    return () => {
      window.removeEventListener(REVIEW_SETTINGS_UPDATED, onUpdated);
      window.removeEventListener(SUBJECTS_UPDATED, onUpdated);
      window.removeEventListener("focus", onUpdated);
    };
  }, [refresh]);

  function startEdit() {
    setDraft(subjects.map((s) => ({ ...s })));
    setEditing(true);
    setMessage(null);
  }

  async function saveEdit() {
    const cleaned = draft
      .map((s) => ({ id: s.id, name: s.name.trim() }))
      .filter((s) => s.name.length > 0);

    if (cleaned.length === 0) {
      setMessage("과목 이름을 1개 이상 입력해 주세요.");
      return;
    }

    let ok = false;
    if (isSupabaseEnabled()) {
      const result = await saveUserSubjectsAction(cleaned);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      ok = true;
    } else {
      ok = await saveUserSubjects(userId, cleaned);
    }

    if (!ok) {
      setMessage("저장에 실패했습니다.");
      return;
    }

    setEditing(false);
    setMessage("과목 목록을 저장했습니다.");
    await refreshSubjects();
    window.dispatchEvent(new CustomEvent(SUBJECTS_UPDATED));
  }

  function addSubject() {
    setDraft((prev) => [
      ...prev,
      { id: createSubjectId("새과목"), name: "새 과목" },
    ]);
  }

  function removeSubject(id: string) {
    const count = counts[id] ?? 0;
    if (count > 0) {
      const name = draft.find((s) => s.id === id)?.name ?? "이 과목";
      const ok = window.confirm(
        `「${name}」에 등록된 문제 ${count}개는 지워지지 않아요.\n보관함에서 「삭제된 과목」으로 볼 수 있어요.\n\n과목 목록에서만 빼시겠어요?`,
      );
      if (!ok) return;
    }
    setDraft((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  return (
    <>
      <p className="mb-4 rounded-xl border border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] px-4 py-3 text-sm text-[var(--rm-text-on-info)]">
        {isUnified ? (
          <>
            <span className="font-semibold">복습 주기: </span>
            {reviewLabels[subjects[0]?.id] ?? "아직 없음"}
            <span className="mt-1 block text-xs text-[var(--rm-text-on-info)]">
              지금은 모든 과목에 같은 주기가 적용돼요.
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">과목마다 복습 주기가 달라요.</span>
            <span className="mt-1 block text-xs text-[var(--rm-text-on-info)]">
              각 과목 카드에서 확인할 수 있어요.
            </span>
          </>
        )}
      </p>

      {message ? (
        <p className="mb-3 rounded-xl bg-[var(--rm-success-bg)] px-4 py-2 text-sm text-[var(--rm-text-on-success)]">
          {message}
        </p>
      ) : null}

      {!editing ? (
        <>
          <ul className="space-y-3">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`/subjects/${subject.id}/settings`}
                  className="remind-card block px-5 py-4 transition hover:border-[var(--rm-info-border)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[var(--rm-text)]">
                      {subject.name}
                    </span>
                    <span className="text-sm text-[var(--rm-text-muted)]">
                      {counts[subject.id] ?? 0}문제
                    </span>
                  </div>
                  {!isUnified ? (
                    <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
                      복습: {reviewLabels[subject.id]}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
                      복습 주기 설정 →
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={startEdit}
            className="mt-4 w-full rounded-xl border-2 border-dashed border-[var(--rm-info-border)] bg-[var(--rm-info-bg)] py-3.5 text-sm font-bold text-[var(--rm-text-on-info)] touch-manipulation"
          >
            + 과목 이름 수정 · 추가
          </button>
        </>
      ) : (
        <div className="remind-filter-panel space-y-3">
          <p className="remind-section-title">과목 이름 편집</p>
          <p className="text-xs text-[var(--rm-text-muted)]">
            예: 공통수학1, 영어독해, 물리학1 — 내가 쓰는 교과 이름으로 바꿀 수
            있어요. 과목을 삭제해도 올린 문제·사진은 보관함에 남아요.
          </p>
          {draft.map((subject, index) => (
            <div key={subject.id} className="flex gap-2">
              <input
                value={subject.name}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev.map((s, i) =>
                      i === index ? { ...s, name: e.target.value } : s,
                    ),
                  )
                }
                className="remind-input flex-1"
              />
              <button
                type="button"
                onClick={() => removeSubject(subject.id)}
                className="rounded-xl border border-[var(--rm-border)] px-3 text-sm text-[var(--rm-text-muted)]"
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSubject}
            className="w-full rounded-xl border border-[var(--rm-info-border)] py-2.5 text-sm font-semibold text-[var(--rm-text-on-info)]"
          >
            + 과목 추가
          </button>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-[var(--rm-border)] py-3 text-sm font-semibold text-[var(--rm-text-muted)]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              className="rounded-xl bg-[var(--rm-brand)] py-3 text-sm font-bold text-white"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </>
  );
}
