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

/** 좁은 화면 또는 모바일 UA — 데스크톱 웹에서는 설치 권유 숨김 */
function isMobileWeb(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const ua = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  return narrow || ua;
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

function AppMark({ size = 44 }: { size?: number }) {
  const glyph = Math.round(size * 0.55);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-white shadow-sm"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        background: "linear-gradient(135deg, #936dff 0%, #2563eb 100%)",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={glyph} height={glyph} fill="currentColor">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
      </svg>
    </span>
  );
}

type Props = {
  /** banner: 하단 유도 / button: 큰 CTA / chip: 헤더 / card: 홈·계정 카드 */
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
    // 데스크톱 웹에서는 어떤 변형도 노출하지 않음
    if (!isMobileWeb()) return;

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

    if (variant === "banner") {
      if (!isBannerDismissed()) setVisible(true);
    } else {
      setVisible(true);
    }

    const onResize = () => {
      if (!isMobileWeb()) {
        setVisible(false);
      } else if (variant !== "banner" || !isBannerDismissed()) {
        if (!isStandalone()) setVisible(true);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("resize", onResize);
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

  const buttonLabel = isIos() ? "홈 화면 추가" : "앱 설치";

  if (variant === "chip") {
    return (
      <div className={`shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          aria-label="앱 설치"
          className="inline-flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#936dff] to-blue-600 px-2.5 text-[11px] font-bold text-white shadow-sm shadow-blue-600/30 transition active:scale-[0.97] hover:brightness-110"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
          </svg>
          <span className="whitespace-nowrap">설치</span>
        </button>
        {guideOpen ? <InstallGuideModal onClose={() => setGuideOpen(false)} /> : null}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-violet-50 p-3 ${className}`}
      >
        <AppMark size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">앱처럼 쓰기</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
            홈 화면에 추가하면 바로 열 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-[11px] font-bold whitespace-nowrap text-white shadow-sm active:scale-[0.97] hover:bg-blue-700"
        >
          {buttonLabel}
        </button>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-6 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
        >
          <AppMark size={28} />
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
        className={`fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md bottom-[calc(4.25rem+env(safe-area-inset-bottom))] ${className}`}
        role="dialog"
        aria-label="앱 설치 안내"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <AppMark size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold tracking-tight text-slate-950">
              3초 만에 홈 화면에 앱 추가하기
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              지금 설치하시면 더 편하게 쓸 수 있어요.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="rounded-full bg-blue-600 px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-white hover:bg-blue-700"
            >
              {buttonLabel}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-2.5 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
            >
              나중에
            </button>
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
        <div className="mb-3 flex items-center gap-3">
          <AppMark size={48} />
          <h2 id="pwa-guide-title" className="text-base font-bold text-slate-900">
            {ios ? "아이폰에서 설치하기" : "앱처럼 설치하기"}
          </h2>
        </div>
        {ios ? (
          <ol className="mt-1 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
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
          <ol className="mt-1 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
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
