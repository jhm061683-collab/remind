"use client";

import { usePwaInstall } from "@/components/pwa/use-pwa-install";

type Props = {
  variant?: "banner" | "button" | "chip" | "card";
  className?: string;
};

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

function ShareIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
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

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Android: beforeinstallprompt → 시스템 설치 창
 * iOS Safari: 시각 중심 홈 화면 추가 안내 (원클릭 설치 API 없음)
 * 카카오 등 인앱: 가짜 설치 금지 → 외부 브라우저 유도
 */
export function InstallAppPrompt({ variant = "banner", className = "" }: Props) {
  const {
    flow,
    canShowPrompt,
    installBusy,
    iosSheetOpen,
    setIosSheetOpen,
    dismiss,
    handleInstall,
  } = usePwaInstall();

  if (!canShowPrompt) return null;
  if (variant === "banner" && flow === "web_fallback") {
    // prompt 없는 Android 일반 브라우저는 배너로 집요하게 안 띄움
    return null;
  }

  const primaryLabel =
    flow === "android_in_app" || flow === "ios_in_app"
      ? "앱으로 사용하기"
      : flow === "android_native"
        ? "앱으로 바로 설치"
        : flow === "ios_safari"
          ? "앱으로 설치"
          : "앱으로 설치";

  const subtitle =
    flow === "android_in_app" || flow === "ios_in_app"
      ? "앱으로 설치하면 문제 촬영이 더 안정적입니다."
      : flow === "android_native"
        ? "앱으로 설치하면 문제 촬영이 더 안정적입니다."
        : flow === "ios_safari"
          ? "홈 화면에 추가하면 앱처럼 쓸 수 있어요."
          : "앱으로 설치하면 더 편하게 쓸 수 있어요.";

  return (
    <>
      {variant === "chip" ? (
        <div className={`shrink-0 ${className}`}>
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installBusy}
            aria-label={primaryLabel}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-[#936dff] to-blue-600 px-2.5 text-[11px] font-bold text-white shadow-sm shadow-blue-600/30 transition active:scale-[0.97] hover:brightness-110 disabled:opacity-60 touch-manipulation"
          >
            <span className="whitespace-nowrap">
              {installBusy ? "준비 중…" : "설치"}
            </span>
          </button>
        </div>
      ) : null}

      {variant === "card" ? (
        <div
          className={`flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-violet-50 p-3 ${className}`}
        >
          <AppMark size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Re:mind</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installBusy}
            className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-[11px] font-bold whitespace-nowrap text-white shadow-sm active:scale-[0.97] hover:bg-blue-700 disabled:opacity-60 touch-manipulation"
          >
            {installBusy ? "…" : primaryLabel}
          </button>
        </div>
      ) : null}

      {variant === "button" ? (
        <div className={className}>
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={installBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 touch-manipulation active:scale-[0.99]"
          >
            <AppMark size={28} />
            {installBusy ? "준비 중…" : primaryLabel}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            {subtitle}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-center text-[11px] font-medium text-slate-400 touch-manipulation"
          >
            웹으로 계속
          </button>
        </div>
      ) : null}

      {variant === "banner" ? (
        <div
          className={`pointer-events-none fixed inset-x-0 z-40 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] ${className}`}
          role="dialog"
          aria-label="앱 설치"
        >
          <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 border border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <AppMark size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold tracking-tight text-slate-950">
                Re:mind
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                {subtitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleInstall()}
                disabled={installBusy}
                className="rounded-full bg-blue-600 px-3.5 py-2 text-[11px] font-bold whitespace-nowrap text-white hover:bg-blue-700 disabled:opacity-60 touch-manipulation"
              >
                {installBusy ? "…" : primaryLabel}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-2.5 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 touch-manipulation"
              >
                웹으로 계속
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {iosSheetOpen ? (
        <IosHomeScreenSheet onClose={() => setIosSheetOpen(false)} />
      ) : null}
    </>
  );
}

/** iOS: 글 최소화 · Safari UI와 비슷한 3단계 시각 안내 */
function IosHomeScreenSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center gap-3">
          <AppMark size={48} />
          <h2
            id="ios-install-title"
            className="text-base font-bold text-slate-900"
          >
            Re:mind를 앱으로 설치
          </h2>
        </div>

        <ol className="mt-5 space-y-3">
          <li className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              1
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <ShareIcon size={26} />
            </span>
            <span className="text-sm font-semibold text-slate-800">공유</span>
          </li>
          <li className="flex justify-center text-slate-300" aria-hidden>
            ↓
          </li>
          <li className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              2
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <PlusSquareIcon />
            </span>
            <span className="text-sm font-semibold text-slate-800">
              홈 화면에 추가
            </span>
          </li>
          <li className="flex justify-center text-slate-300" aria-hidden>
            ↓
          </li>
          <li className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              3
            </span>
            <span className="flex h-11 min-w-[4.5rem] items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm">
              추가
            </span>
          </li>
        </ol>

        <div className="mt-4 flex flex-col items-center gap-1 pb-1 sm:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 animate-bounce">
            <ShareIcon />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white touch-manipulation"
        >
          확인
        </button>
      </div>
    </div>
  );
}

/** 인앱에서 촬영 직전 — 설치 유도 (웹 촬영도 가능) */
export function CameraInstallNudge({
  open,
  onOpenApp,
  onContinueWeb,
}: {
  open: boolean;
  onOpenApp: () => void;
  onContinueWeb: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="앱으로 사용하기"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <AppMark size={48} />
          <div>
            <p className="text-base font-bold text-slate-900">앱으로 사용하기</p>
            <p className="mt-1 text-sm text-slate-600">
              앱에서 촬영하면 더 안정적입니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenApp}
          className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white touch-manipulation active:scale-[0.99]"
        >
          앱으로 사용하기
        </button>
        <button
          type="button"
          onClick={onContinueWeb}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500 touch-manipulation"
        >
          이번만 웹에서 촬영
        </button>
      </div>
    </div>
  );
}
