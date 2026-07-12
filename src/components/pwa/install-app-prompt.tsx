"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "remind-pwa-install-dismissed-at";
/** 배너 다시 보이기까지 (ms) — 3일 */
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobileWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

type Props = {
  /** banner: 하단 유도 / button: 큰 CTA / chip: 헤더 / card: 로그인 후 홈 카드 */
  variant?: "banner" | "button" | "chip" | "card";
  className?: string;
};

export function InstallAppPrompt({ variant = "banner", className = "" }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // 웹(특히 모바일)에서는 로그인 후에도 설치 권유를 보이게
    if (variant === "banner") {
      if (!isBannerDismissed() && (isMobileWeb() || isIos())) {
        setVisible(true);
      }
    } else {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [variant]);

  if (installed) return null;
  if (!visible && !deferred) return null;

  const dismiss = () => {
    if (variant === "banner") {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
    setGuideOpen(false);
  };

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setVisible(false);
      }
      return;
    }
    setGuideOpen(true);
  };

  const buttonLabel = isIos() ? "홈 화면에 추가" : "앱으로 설치";

  if (variant === "chip") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="rm-nav-item rounded-xl bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
        >
          앱 설치
        </button>
        {guideOpen ? <InstallGuideModal onClose={() => setGuideOpen(false)} /> : null}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ${className}`}
      >
        <p className="text-sm font-bold text-slate-900">앱처럼 설치해 보세요</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          홈 화면에 추가하면 브라우저 주소창 없이 바로 Re:mind를 열 수 있어요.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            {buttonLabel}
          </button>
        </div>
        {guideOpen ? <InstallGuideModal onClose={() => setGuideOpen(false)} /> : null}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-8 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
        >
          {buttonLabel}
        </button>
        {guideOpen ? <InstallGuideModal onClose={() => setGuideOpen(false)} /> : null}
      </div>
    );
  }

  if (!visible) return null;

  return (
    <>
      <div
        className={`fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-0 ${className}`}
        role="dialog"
        aria-label="앱 설치 안내"
      >
        <div className="mx-auto flex max-w-lg items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#936dff] to-blue-600 text-lg font-bold text-white">
            R
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Re:mind를 앱처럼 설치하세요</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              로그인 후에도 홈 화면에 추가하면 더 편하게 쓸 수 있어요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                {buttonLabel}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      </div>
      {guideOpen ? <InstallGuideModal onClose={() => setGuideOpen(false)} /> : null}
    </>
  );
}

function InstallGuideModal({ onClose }: { onClose: () => void }) {
  const ios = isIos();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pwa-guide-title" className="text-base font-bold text-slate-900">
          {ios ? "아이폰에서 설치하기" : "앱처럼 설치하기"}
        </h2>
        {ios ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>
              하단(또는 상단) <strong>공유</strong> 버튼을 누르세요.
            </li>
            <li>
              <strong>홈 화면에 추가</strong>를 선택하세요.
            </li>
            <li>
              <strong>추가</strong>를 누르면 앱처럼 실행됩니다.
            </li>
          </ol>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>브라우저 메뉴(⋮)를 엽니다.</li>
            <li>
              <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요.
            </li>
            <li>설치가 끝나면 아이콘으로 바로 실행할 수 있습니다.</li>
          </ol>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
