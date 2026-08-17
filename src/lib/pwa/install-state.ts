/**
 * PWA 설치 안내 표시 정책 (순수).
 * neverShown | shown | dismissed | installed
 */

export type InstallUiState =
  | "neverShown"
  | "shown"
  | "dismissed"
  | "installed";

export const PWA_DISMISS_KEY = "remind-pwa-install-dismissed-at";
export const PWA_DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const PWA_CAMERA_NUDGE_KEY = "remind-pwa-camera-nudge-dismissed-at";
export const PWA_CAMERA_NUDGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function resolveInstallUiState(input: {
  isStandalone: boolean;
  dismissedAt: number | null;
  now?: number;
  dismissTtlMs?: number;
}): InstallUiState {
  if (input.isStandalone) return "installed";
  const now = input.now ?? Date.now();
  const ttl = input.dismissTtlMs ?? PWA_DISMISS_TTL_MS;
  if (
    input.dismissedAt != null &&
    Number.isFinite(input.dismissedAt) &&
    now - input.dismissedAt < ttl
  ) {
    return "dismissed";
  }
  if (input.dismissedAt != null) return "neverShown";
  return "neverShown";
}

/** 전역 배너/모달을 보여줄지 */
export function shouldShowInstallPrompt(input: {
  state: InstallUiState;
  isMobile: boolean;
  /** Android prompt 가능 / iOS 안내 / 인앱 외부 브라우저 유도 */
  hasUsefulAction: boolean;
}): boolean {
  if (input.state === "installed" || input.state === "dismissed") return false;
  if (!input.isMobile) return false;
  return input.hasUsefulAction;
}

/** 촬영 직전 작은 설치 CTA (dismissed 여도 TTL 지나면 가능) */
export function shouldShowCameraInstallNudge(input: {
  isStandalone: boolean;
  isInAppBrowser: boolean;
  cameraNudgeDismissedAt: number | null;
  now?: number;
  ttlMs?: number;
}): boolean {
  if (input.isStandalone) return false;
  if (!input.isInAppBrowser) return false;
  const now = input.now ?? Date.now();
  const ttl = input.ttlMs ?? PWA_CAMERA_NUDGE_TTL_MS;
  if (
    input.cameraNudgeDismissedAt != null &&
    Number.isFinite(input.cameraNudgeDismissedAt) &&
    now - input.cameraNudgeDismissedAt < ttl
  ) {
    return false;
  }
  return true;
}

export type InstallFlowKind =
  | "hidden"
  | "android_native"
  | "android_in_app"
  | "ios_safari"
  | "ios_in_app"
  | "web_fallback";

export function resolveInstallFlow(input: {
  isStandalone: boolean;
  os: "ios" | "android" | "other";
  isInAppBrowser: boolean;
  hasBeforeInstallPrompt: boolean;
  isMobile: boolean;
}): InstallFlowKind {
  if (input.isStandalone || !input.isMobile) return "hidden";
  if (input.os === "android") {
    if (input.isInAppBrowser) return "android_in_app";
    if (input.hasBeforeInstallPrompt) return "android_native";
    return "web_fallback";
  }
  if (input.os === "ios") {
    if (input.isInAppBrowser) return "ios_in_app";
    return "ios_safari";
  }
  return "web_fallback";
}
