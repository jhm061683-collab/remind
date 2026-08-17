import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectBrowserEnvironment,
  resolveCameraStrategy,
  resolveCanProgrammaticallyInstall,
  buildExternalBrowserOpenUrl,
} from "./browser-environment.ts";
import {
  resolveInstallFlow,
  resolveInstallUiState,
  shouldShowCameraInstallNudge,
  shouldShowInstallPrompt,
} from "./install-state.ts";

describe("detectBrowserEnvironment", () => {
  it("standalone 에서는 설치 CTA 대상이 아님 (installed)", () => {
    const env = detectBrowserEnvironment({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      isStandalone: true,
      isNarrowViewport: true,
    });
    assert.equal(env.isStandalone, true);
    assert.equal(env.canProgrammaticallyInstall, false);
  });

  it("Android Chrome: custom camera + programmatic install 가능", () => {
    const env = detectBrowserEnvironment({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      isStandalone: false,
      isNarrowViewport: true,
    });
    assert.equal(env.os, "android");
    assert.equal(env.browser, "chrome");
    assert.equal(env.isInAppBrowser, false);
    assert.equal(env.cameraStrategy, "custom_get_user_media");
    assert.equal(env.canProgrammaticallyInstall, true);
  });

  it("KakaoTalk In-App: native capture 우선, 원클릭 설치 불가", () => {
    const env = detectBrowserEnvironment({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 KAKAOTALK",
      isStandalone: false,
      isNarrowViewport: true,
    });
    assert.equal(env.isInAppBrowser, true);
    assert.equal(env.browser, "kakaotalk");
    assert.equal(env.cameraStrategy, "native_file_capture");
    assert.equal(env.canProgrammaticallyInstall, false);
  });

  it("iOS Safari: beforeinstallprompt에 의존하지 않음", () => {
    const env = detectBrowserEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isStandalone: false,
      isNarrowViewport: true,
    });
    assert.equal(env.os, "ios");
    assert.equal(env.browser, "safari");
    assert.equal(env.canProgrammaticallyInstall, false);
    assert.equal(env.cameraStrategy, "custom_get_user_media");
  });

  it("iOS KakaoTalk: Safari 이동 우선 흐름", () => {
    const env = detectBrowserEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK",
      isStandalone: false,
      isNarrowViewport: true,
    });
    assert.equal(env.isInAppBrowser, true);
    assert.equal(env.cameraStrategy, "native_file_capture");
    assert.equal(
      resolveInstallFlow({
        isStandalone: false,
        os: env.os,
        isInAppBrowser: true,
        hasBeforeInstallPrompt: false,
        isMobile: true,
      }),
      "ios_in_app",
    );
  });
});

describe("camera strategy helpers", () => {
  it("getUserMedia 실패 환경은 native_file_capture", () => {
    assert.equal(
      resolveCameraStrategy({ isInAppBrowser: true, isStandalone: false }),
      "native_file_capture",
    );
  });

  it("PWA/일반 브라우저는 custom 가능", () => {
    assert.equal(
      resolveCameraStrategy({ isInAppBrowser: false, isStandalone: true }),
      "custom_get_user_media",
    );
  });
});

describe("install state machine", () => {
  it("standalone 에서는 배너 없음", () => {
    assert.equal(
      resolveInstallUiState({ isStandalone: true, dismissedAt: null }),
      "installed",
    );
    assert.equal(
      shouldShowInstallPrompt({
        state: "installed",
        isMobile: true,
        hasUsefulAction: true,
      }),
      false,
    );
  });

  it("Android beforeinstallprompt 지원 시 android_native", () => {
    assert.equal(
      resolveInstallFlow({
        isStandalone: false,
        os: "android",
        isInAppBrowser: false,
        hasBeforeInstallPrompt: true,
        isMobile: true,
      }),
      "android_native",
    );
  });

  it("iOS는 beforeinstallprompt 유무와 관계없이 ios_safari", () => {
    assert.equal(
      resolveInstallFlow({
        isStandalone: false,
        os: "ios",
        isInAppBrowser: false,
        hasBeforeInstallPrompt: true,
        isMobile: true,
      }),
      "ios_safari",
    );
    assert.equal(
      resolveCanProgrammaticallyInstall({
        os: "ios",
        isInAppBrowser: false,
        isStandalone: false,
      }),
      false,
    );
  });

  it("dismissed TTL 안에서는 배너 숨김", () => {
    const now = 1_000_000;
    const state = resolveInstallUiState({
      isStandalone: false,
      dismissedAt: now - 1000,
      now,
      dismissTtlMs: 10_000,
    });
    assert.equal(state, "dismissed");
    assert.equal(
      shouldShowInstallPrompt({
        state,
        isMobile: true,
        hasUsefulAction: true,
      }),
      false,
    );
  });

  it("인앱에서 촬영 nudge 가능, standalone 불가", () => {
    assert.equal(
      shouldShowCameraInstallNudge({
        isStandalone: false,
        isInAppBrowser: true,
        cameraNudgeDismissedAt: null,
      }),
      true,
    );
    assert.equal(
      shouldShowCameraInstallNudge({
        isStandalone: true,
        isInAppBrowser: true,
        cameraNudgeDismissedAt: null,
      }),
      false,
    );
  });
});

describe("kakao external browser", () => {
  it("카카오는 openExternal 스키마 사용", () => {
    const r = buildExternalBrowserOpenUrl(
      "https://wrong-note-app-nu.vercel.app/upload",
      "kakaotalk",
    );
    assert.equal(r.mode, "assign");
    assert.match(r.href, /^kakaotalk:\/\/web\/openExternal\?url=/);
  });
});
