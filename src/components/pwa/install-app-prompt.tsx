"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "remind-pwa-install-dismissed-at";
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** React 마운트 전에 오는 beforeinstallprompt 도 잡아 둠 */
let cachedPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("remind-pwa-ready"));
  });
  window.addEventListener("appinstalled", () => {
    cachedPrompt = null;
  });
}

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

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/** 카카오톡·네이버·인스타 등 인앱 브라우저는 PWA 설치가 불가능 */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /kakaotalk|naver|instagram|fbav|fban|line\/|everytimeapp|daumapps/i.test(
    navigator.userAgent,
  );
}

function isKakaoTalk(): boolean {
  if (typeof navigator === "undefined") return false;
  return /kakaotalk/i.test(navigator.userAgent);
}

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

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  variant?: "banner" | "button" | "chip" | "card";
  className?: string;
};

/**
 * 안드로이드/Chrome: beforeinstallprompt → 바로 설치 창
 * 아이폰: Apple이 자동 설치 API를 막아서, 설치 탭 시 「공유 → 홈 화면에 추가」시트만 짧게 띄움
 */
export function InstallAppPrompt({ variant = "banner", className = "" }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [bannerAllowed, setBannerAllowed] = useState(true);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const [guideSheetOpen, setGuideSheetOpen] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onMobile = isMobileWeb();
    setMobile(onMobile);
    setIosDevice(isIos());
    setAndroidDevice(isAndroid());
    setInApp(isInAppBrowser());
    if (!onMobile) return;

    if (cachedPrompt) setDeferred(cachedPrompt);
    if (variant === "banner" && isBannerDismissed()) {
      setBannerAllowed(false);
    }

    const syncPrompt = () => {
      if (cachedPrompt) setDeferred(cachedPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      cachedPrompt = null;
      setIosSheetOpen(false);
    };

    window.addEventListener("remind-pwa-ready", syncPrompt);
    window.addEventListener("beforeinstallprompt", syncPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("remind-pwa-ready", syncPrompt);
      window.removeEventListener("beforeinstallprompt", syncPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [variant]);

  const canNativeInstall = Boolean(deferred);
  // 인앱 브라우저(카카오톡 등)와 안드로이드는 이벤트가 없어도 안내를 띄운다.
  const canShow =
    !installed &&
    mobile &&
    (canNativeInstall || iosDevice || androidDevice || inApp);

  if (!canShow) return null;
  if (variant === "banner" && !bannerAllowed) return null;

  const dismissBanner = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setBannerAllowed(false);
    setIosSheetOpen(false);
    setGuideSheetOpen(false);
  };

  const handleInstall = async () => {
    // 카카오톡 등 인앱 브라우저: 설치가 막혀 있어 외부 브라우저로 유도
    if (inApp) {
      if (isKakaoTalk()) {
        window.location.href =
          "kakaotalk://web/openExternal?url=" +
          encodeURIComponent(window.location.href);
        return;
      }
      setGuideSheetOpen(true);
      return;
    }

    const promptEvent = deferred ?? cachedPrompt;
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setDeferred(null);
      cachedPrompt = null;
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    // iOS: 브라우저가 설치 API를 안 열어서, 홈 화면 추가 시트만 표시
    if (iosDevice) {
      setIosSheetOpen(true);
      return;
    }
    // 안드로이드인데 설치 이벤트가 아직/전혀 없을 때: 메뉴 안내
    setGuideSheetOpen(true);
  };

  const installLabel = inApp
    ? "브라우저에서 열기"
    : iosDevice
      ? "홈 화면 추가"
      : "앱 설치";

  return (
    <>
      {variant === "chip" ? (
        <div className={`shrink-0 ${className}`}>
          <button
            type="button"
            onClick={() => void handleInstall()}
            aria-label={installLabel}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#936dff] to-blue-600 px-2.5 text-[11px] font-bold text-white shadow-sm shadow-blue-600/30 transition active:scale-[0.97] hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 8.5L5.5 8 12 4.5 18.5 8 12 11.5zM3 19v-2h18v2H3z" />
            </svg>
            <span className="whitespace-nowrap">설치</span>
          </button>
        </div>
      ) : null}

      {variant === "card" ? (
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
            {installLabel}
          </button>
        </div>
      ) : null}

      {variant === "button" ? (
        <div className={className}>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-6 py-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <AppMark size={28} />
            {installLabel}
          </button>
        </div>
      ) : null}

      {variant === "banner" ? (
        <div
          className={`fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md bottom-[calc(4.25rem+env(safe-area-inset-bottom))] ${className}`}
          role="dialog"
          aria-label="앱 설치"
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
                {installLabel}
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                className="rounded-full px-2.5 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {iosSheetOpen ? (
        <IosHomeScreenSheet onClose={() => setIosSheetOpen(false)} />
      ) : null}

      {guideSheetOpen ? (
        <InstallGuideSheet
          inApp={inApp}
          onClose={() => setGuideSheetOpen(false)}
        />
      ) : null}
    </>
  );
}

/** 안드로이드 크롬 메뉴 안내 + 인앱 브라우저 탈출 안내 */
function InstallGuideSheet({
  inApp,
  onClose,
}: {
  inApp: boolean;
  onClose: () => void;
}) {
  const steps = inApp
    ? [
        {
          title: "오른쪽 위 ⋮ (또는 공유) 누르기",
          desc: "카카오톡·인앱 브라우저에서는 앱 설치가 막혀 있어요.",
        },
        {
          title: "「다른 브라우저로 열기」 선택",
          desc: "Chrome 또는 Safari로 열어 주세요.",
        },
        {
          title: "브라우저에서 「앱 설치」 다시 누르기",
          desc: "그러면 홈 화면에 Re:mind가 설치돼요.",
        },
      ]
    : [
        {
          title: "오른쪽 위 ⋮ 메뉴 누르기",
          desc: "Chrome 주소창 옆 점 3개 버튼이에요.",
        },
        {
          title: "「홈 화면에 추가」 또는 「앱 설치」 선택",
          desc: "목록 중간쯤에 있어요.",
        },
        {
          title: "「설치」 누르기",
          desc: "홈 화면에 Re:mind 아이콘이 생겨요.",
        },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center gap-3">
          <AppMark size={48} />
          <div>
            <h2
              id="install-guide-title"
              className="text-base font-bold text-slate-900"
            >
              {inApp ? "브라우저에서 열어 주세요" : "홈 화면에 추가"}
            </h2>
            <p className="text-xs text-slate-500">
              {inApp
                ? "카카오톡 안에서는 설치가 안 돼요"
                : "메뉴에서 바로 추가할 수 있어요"}
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}

/** 아이폰 전용: 공유 버튼 위치를 강조한 짧은 설치 시트 */
function IosHomeScreenSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center gap-3">
          <AppMark size={48} />
          <div>
            <h2 id="ios-install-title" className="text-base font-bold text-slate-900">
              홈 화면에 추가
            </h2>
            <p className="text-xs text-slate-500">아이폰은 Safari 공유로 설치해요</p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          <li className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">아래 공유 버튼</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Safari 하단 가운데 <span className="inline-flex align-middle text-blue-600"><ShareIcon /></span> 아이콘을
                누르세요.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">「홈 화면에 추가」</p>
              <p className="mt-0.5 text-xs text-slate-500">
                목록을 조금 내리면 바로 보여요.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">「추가」 누르기</p>
              <p className="mt-0.5 text-xs text-slate-500">
                끝나면 홈 화면에 Re:mind 아이콘이 생겨요.
              </p>
            </div>
          </li>
        </ol>

        {/* 하단 공유 위치 힌트 (Safari 바 근처) */}
        <div className="mt-5 flex flex-col items-center gap-1 pb-1 sm:hidden">
          <p className="text-[11px] font-medium text-blue-600">아래에서 공유를 누르세요</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 animate-bounce">
            <ShareIcon />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
