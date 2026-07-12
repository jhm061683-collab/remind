"use client";

import { useEffect } from "react";

/** PWA 설치 조건을 위해 서비스 워커를 등록합니다. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 설치 실패는 조용히 무시 — 앱 사용에는 영향 없음 */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
