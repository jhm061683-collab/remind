/**
 * 브라우저/OS/인앱 WebView 환경 감지 (순수 함수).
 * UA 문자열과 런타임 플래그만 받아 컴포넌트에 중복 작성하지 않는다.
 */

export type BrowserOs = "ios" | "android" | "other";

export type BrowserKind =
  | "kakaotalk"
  | "naver"
  | "instagram"
  | "facebook"
  | "line"
  | "samsung"
  | "whale"
  | "chrome"
  | "safari"
  | "ios_chrome"
  | "other";

/** 카메라 Progressive Enhancement 전략 */
export type CameraStrategy = "custom_get_user_media" | "native_file_capture";

export type BrowserEnvironment = {
  os: BrowserOs;
  browser: BrowserKind;
  isInAppBrowser: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  /** beforeinstallprompt 기반 원클릭 설치가 가능한 환경인지 (이벤트 존재와 별개로 플랫폼 가능성) */
  canProgrammaticallyInstall: boolean;
  cameraStrategy: CameraStrategy;
};

export type DetectBrowserEnvironmentInput = {
  userAgent: string;
  /** (display-mode: standalone) 또는 iOS navigator.standalone */
  isStandalone?: boolean;
  /** max-width 또는 coarse pointer 등 모바일 휴리스틱 */
  isNarrowViewport?: boolean;
};

const IN_APP_PATTERNS: Array<{ kind: BrowserKind; re: RegExp }> = [
  { kind: "kakaotalk", re: /kakaotalk/i },
  { kind: "naver", re: /naver/i },
  { kind: "instagram", re: /instagram/i },
  { kind: "facebook", re: /fbav|fban/i },
  { kind: "line", re: /line\//i },
];

export function detectOs(userAgent: string): BrowserOs {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  // iPadOS 13+ desktop UA
  if (/macintosh/i.test(userAgent) && /mobile/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "other";
}

export function detectInAppBrowser(userAgent: string): {
  isInAppBrowser: boolean;
  browser: BrowserKind | null;
} {
  for (const { kind, re } of IN_APP_PATTERNS) {
    if (re.test(userAgent)) {
      return { isInAppBrowser: true, browser: kind };
    }
  }
  // 기타 인앱 (에브리타임·다음 등) — 브라우저 kind 는 other
  if (/everytimeapp|daumapps|band\//i.test(userAgent)) {
    return { isInAppBrowser: true, browser: "other" };
  }
  return { isInAppBrowser: false, browser: null };
}

export function detectBrowserKind(
  userAgent: string,
  os: BrowserOs,
  inAppKind: BrowserKind | null,
): BrowserKind {
  if (inAppKind) return inAppKind;

  if (os === "ios") {
    // iOS Chrome은 CriOS
    if (/crios/i.test(userAgent)) return "ios_chrome";
    if (/fxios|edgios|opt\/|whale/i.test(userAgent)) return "other";
    // Safari (Version/... Safari) — Chrome이 아닌 WebKit
    if (/safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent)) {
      return "safari";
    }
    return "other";
  }

  if (/samsungbrowser/i.test(userAgent)) return "samsung";
  if (/whale/i.test(userAgent)) return "whale";
  if (/chrome|crios|chromium/i.test(userAgent) && !/edg/i.test(userAgent)) {
    return "chrome";
  }
  if (/safari/i.test(userAgent) && !/chrome|chromium/i.test(userAgent)) {
    return "safari";
  }
  return "other";
}

/**
 * 카메라 전략:
 * - 인앱 WebView: MediaStream 호환성이 불확실 → 네이티브 file/capture 우선
 * - 그 외 모바일/데스크톱 보안 컨텍스트: custom getUserMedia 가능 (호출 측에서 secureContext 확인)
 */
export function resolveCameraStrategy(input: {
  isInAppBrowser: boolean;
  isStandalone: boolean;
}): CameraStrategy {
  if (input.isInAppBrowser) return "native_file_capture";
  return "custom_get_user_media";
}

/**
 * Android Chrome 계열만 beforeinstallprompt 원클릭이 실질적으로 가능하다.
 * iOS·인앱은 false (가짜 설치 버튼 금지).
 */
export function resolveCanProgrammaticallyInstall(input: {
  os: BrowserOs;
  isInAppBrowser: boolean;
  isStandalone: boolean;
}): boolean {
  if (input.isStandalone || input.isInAppBrowser) return false;
  return input.os === "android";
}

export function detectBrowserEnvironment(
  input: DetectBrowserEnvironmentInput,
): BrowserEnvironment {
  const ua = input.userAgent || "";
  const os = detectOs(ua);
  const inApp = detectInAppBrowser(ua);
  const browser = detectBrowserKind(ua, os, inApp.browser);
  const isStandalone = Boolean(input.isStandalone);
  const isMobile =
    Boolean(input.isNarrowViewport) ||
    os === "ios" ||
    os === "android" ||
    /mobile/i.test(ua);

  return {
    os,
    browser,
    isInAppBrowser: inApp.isInAppBrowser,
    isStandalone,
    isMobile,
    canProgrammaticallyInstall: resolveCanProgrammaticallyInstall({
      os,
      isInAppBrowser: inApp.isInAppBrowser,
      isStandalone,
    }),
    cameraStrategy: resolveCameraStrategy({
      isInAppBrowser: inApp.isInAppBrowser,
      isStandalone,
    }),
  };
}

/** 클라이언트에서 한 번 읽어 쓰는 헬퍼 */
export function readBrowserEnvironment(): BrowserEnvironment {
  if (typeof window === "undefined") {
    return detectBrowserEnvironment({ userAgent: "" });
  }
  const mqStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const narrow = window.matchMedia("(max-width: 767px)").matches;

  return detectBrowserEnvironment({
    userAgent: navigator.userAgent,
    isStandalone: mqStandalone || iosStandalone,
    isNarrowViewport: narrow,
  });
}

/**
 * 카카오톡 공식 외부 브라우저 스키마 (문서화된 방식).
 * 기타 인앱은 강제 스킴 해킹 없이 안내/새 창만 시도.
 */
export function buildExternalBrowserOpenUrl(
  currentUrl: string,
  browser: BrowserKind,
): { href: string; mode: "assign" | "open_blank" } {
  if (browser === "kakaotalk") {
    return {
      href:
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl),
      mode: "assign",
    };
  }
  return { href: currentUrl, mode: "open_blank" };
}
