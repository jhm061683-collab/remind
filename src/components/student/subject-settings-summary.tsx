"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildSettingsSummary,
} from "@/lib/data/custom-presets";
import {
  getReviewSettings,
  REVIEW_SETTINGS_UPDATED,
} from "@/lib/data/review-settings";

type Props = {
  subjectId: string;
  userId: string;
};

export function SubjectSettingsSummary({ subjectId, userId }: Props) {
  const [summary, setSummary] = useState("설정을 불러오는 중...");

  const refresh = useCallback(async () => {
    const settings = await getReviewSettings(userId, subjectId);
    setSummary(buildSettingsSummary(settings));
  }, [subjectId, userId]);

  useEffect(() => {
    void refresh();

    function onUpdated(event: Event) {
      const detail = (event as CustomEvent<{ subjectId: string }>).detail;
      if (!detail || detail.subjectId === subjectId) {
        void refresh();
      }
    }

    function onVisible() {
      void refresh();
    }

    window.addEventListener(REVIEW_SETTINGS_UPDATED, onUpdated);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.removeEventListener(REVIEW_SETTINGS_UPDATED, onUpdated);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh, subjectId]);

  return (
    <p className="mb-4 rounded-xl bg-zinc-100 px-4 py-3 text-xs leading-relaxed text-zinc-600">
      <span className="font-semibold text-zinc-800">현재 복습 규칙: </span>
      {summary}
    </p>
  );
}
