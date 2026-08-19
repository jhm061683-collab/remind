"use client";

import { useCallback, useEffect, useState } from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

export function useTemporaryLandscape() {
  const [requested, setRequested] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const exit = useCallback(async () => {
    const orientation = screen.orientation as LockableOrientation | undefined;
    try {
      orientation?.unlock?.();
    } catch {
      // 브라우저가 unlock을 거부해도 viewer 닫기는 계속한다.
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // 이미 fullscreen이 끝난 경우 안전하게 무시한다.
      }
    }
    setRequested(false);
    setNotice(null);
  }, []);

  const toggle = useCallback(
    async (element: HTMLElement | null) => {
      if (requested) {
        await exit();
        return;
      }
      setRequested(true);
      setNotice(null);

      let fullscreen = Boolean(document.fullscreenElement);
      if (!fullscreen && element?.requestFullscreen) {
        try {
          await element.requestFullscreen();
          fullscreen = true;
        } catch {
          fullscreen = false;
        }
      }

      const orientation = screen.orientation as LockableOrientation | undefined;
      if (fullscreen && orientation?.lock) {
        try {
          await orientation.lock("landscape");
          setNotice("가로 보기로 전환했습니다.");
          return;
        } catch {
          // iOS Safari와 정책 제한 환경은 안내 fallback으로 내려간다.
        }
      }
      setNotice(
        "이 브라우저는 방향 고정을 지원하지 않습니다. 전체 화면에서 기기 회전 잠금을 해제한 뒤 가로로 돌려 주세요.",
      );
    },
    [exit, requested],
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && requested) {
        const orientation = screen.orientation as LockableOrientation | undefined;
        orientation?.unlock?.();
        setRequested(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [requested]);

  return { requested, notice, toggle, exit };
}
