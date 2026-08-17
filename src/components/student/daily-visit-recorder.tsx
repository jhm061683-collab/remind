"use client";

import { useEffect, useRef } from "react";
import { recordDailyVisitAction } from "@/lib/actions/daily-visit";
import { toDateKey } from "@/lib/utils/date-range";

const STORAGE_PREFIX = "remind:daily-visit:";

type Props = {
  userId: string;
};

/**
 * 세션 유지 사용자도 출석 반영 — 페이지 이동마다 DB 조회하지 않도록
 * 브라우저 sessionStorage로 하루 1회만 서버에 기록한다.
 */
export function DailyVisitRecorder({ userId }: Props) {
  const started = useRef(false);

  useEffect(() => {
    if (!userId || userId === "guest" || started.current) return;
    started.current = true;

    const dayKey = toDateKey(new Date());
    const storageKey = `${STORAGE_PREFIX}${userId}:${dayKey}`;
    try {
      if (sessionStorage.getItem(storageKey) === "1") return;
    } catch {
      /* private mode 등 */
    }

    void recordDailyVisitAction()
      .then(() => {
        try {
          sessionStorage.setItem(storageKey, "1");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* 조용히 — 출석 실패해도 앱 사용은 계속 */
      });
  }, [userId]);

  return null;
}
