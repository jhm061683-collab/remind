"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  buildExternalBrowserOpenUrl,
  readBrowserEnvironment,
  type BrowserEnvironment,
} from "@/lib/pwa/browser-environment";
import {
  PWA_CAMERA_NUDGE_KEY,
  PWA_CAMERA_NUDGE_TTL_MS,
  PWA_DISMISS_KEY,
  PWA_DISMISS_TTL_MS,
  resolveInstallFlow,
  resolveInstallUiState,
  shouldShowCameraInstallNudge,
  shouldShowInstallPrompt,
  type InstallFlowKind,
  type InstallUiState,
} from "@/lib/pwa/install-state";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** React 마운트 전 이벤트를 잡아 둔다 */
let cachedPrompt: BeforeInstallPromptEvent | null = null;
let cachedEnvironment: BrowserEnvironment | null = null;

const subscribeBrowserEnvironment = () => () => {};

function getBrowserEnvironmentSnapshot(): BrowserEnvironment {
  cachedEnvironment ??= readBrowserEnvironment();
  return cachedEnvironment;
}

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

function readDismissedAt(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const at = Number(raw);
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

function writeDismissedAt(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function readInitialUiState(): InstallUiState {
  if (typeof window === "undefined") return "neverShown";
  const current = readBrowserEnvironment();
  return resolveInstallUiState({
    isStandalone: current.isStandalone,
    dismissedAt: readDismissedAt(PWA_DISMISS_KEY),
    dismissTtlMs: PWA_DISMISS_TTL_MS,
  });
}

export function usePwaInstall() {
  const env = useSyncExternalStore<BrowserEnvironment | null>(
    subscribeBrowserEnvironment,
    getBrowserEnvironmentSnapshot,
    () => null,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => cachedPrompt,
  );
  const [uiState, setUiState] = useState<InstallUiState>(readInitialUiState);
  const [installBusy, setInstallBusy] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const [cameraNudgeOpen, setCameraNudgeOpen] = useState(false);

  useEffect(() => {
    const syncPrompt = () => {
      if (cachedPrompt) setDeferred(cachedPrompt);
    };
    const onInstalled = () => {
      setUiState("installed");
      setDeferred(null);
      cachedPrompt = null;
      setIosSheetOpen(false);
      setCameraNudgeOpen(false);
    };

    window.addEventListener("remind-pwa-ready", syncPrompt);
    window.addEventListener("beforeinstallprompt", syncPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("remind-pwa-ready", syncPrompt);
      window.removeEventListener("beforeinstallprompt", syncPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const flow: InstallFlowKind = env
    ? resolveInstallFlow({
        isStandalone: env.isStandalone,
        os: env.os,
        isInAppBrowser: env.isInAppBrowser,
        hasBeforeInstallPrompt: Boolean(deferred ?? cachedPrompt),
        isMobile: env.isMobile,
      })
    : "hidden";

  const canShowBanner =
    env != null &&
    shouldShowInstallPrompt({
      state: uiState,
      isMobile: env.isMobile,
      hasUsefulAction: flow !== "hidden" && flow !== "web_fallback",
    });

  // Android에 prompt가 아직 없어도 인앱/iOS면 배너 허용. web_fallback만은 약하게.
  const canShowPrompt =
    env != null &&
    uiState !== "installed" &&
    uiState !== "dismissed" &&
    env.isMobile &&
    flow !== "hidden";

  const dismiss = useCallback(() => {
    writeDismissedAt(PWA_DISMISS_KEY);
    setUiState("dismissed");
    setIosSheetOpen(false);
  }, []);

  const openExternalBrowser = useCallback(() => {
    if (!env) return;
    const { href, mode } = buildExternalBrowserOpenUrl(
      window.location.href,
      env.browser,
    );
    if (mode === "assign") {
      window.location.href = href;
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }, [env]);

  const promptNativeInstall = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferred ?? cachedPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setDeferred(null);
    cachedPrompt = null;
    if (choice.outcome === "accepted") {
      setUiState("installed");
      return true;
    }
    // 같은 세션에서 집요하게 다시 띄우지 않음
    writeDismissedAt(PWA_DISMISS_KEY);
    setUiState("dismissed");
    return false;
  }, [deferred]);

  const handleInstall = useCallback(async () => {
    if (installBusy || !env) return;
    setInstallBusy(true);
    setUiState((s) => (s === "neverShown" ? "shown" : s));
    try {
      if (flow === "android_native" || (deferred ?? cachedPrompt)) {
        const ok = await promptNativeInstall();
        if (ok) return;
        // prompt 실패/취소 후 Android 일반 웹이면 더 이상 강제하지 않음
        return;
      }

      if (flow === "android_in_app" || flow === "ios_in_app") {
        openExternalBrowser();
        return;
      }

      if (flow === "ios_safari") {
        setIosSheetOpen(true);
        return;
      }

      // Android인데 이벤트가 늦은 경우 짧게 대기
      if (env.os === "android" && !env.isInAppBrowser) {
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => window.setTimeout(r, 250));
          if (cachedPrompt) {
            setDeferred(cachedPrompt);
            await promptNativeInstall();
            return;
          }
        }
      }
    } finally {
      setInstallBusy(false);
    }
  }, [
    installBusy,
    env,
    flow,
    deferred,
    promptNativeInstall,
    openExternalBrowser,
  ]);

  const maybeOpenCameraNudge = useCallback((): boolean => {
    if (!env) return true;
    const show = shouldShowCameraInstallNudge({
      isStandalone: env.isStandalone,
      isInAppBrowser: env.isInAppBrowser,
      cameraNudgeDismissedAt: readDismissedAt(PWA_CAMERA_NUDGE_KEY),
      ttlMs: PWA_CAMERA_NUDGE_TTL_MS,
    });
    if (!show) return true;
    setCameraNudgeOpen(true);
    return false;
  }, [env]);

  const dismissCameraNudge = useCallback(() => {
    writeDismissedAt(PWA_CAMERA_NUDGE_KEY);
    setCameraNudgeOpen(false);
  }, []);

  const closeCameraNudge = useCallback(() => {
    setCameraNudgeOpen(false);
  }, []);

  return {
    env,
    flow,
    uiState,
    installBusy,
    iosSheetOpen,
    setIosSheetOpen,
    cameraNudgeOpen,
    canShowBanner: canShowBanner || canShowPrompt,
    canShowPrompt,
    deferred,
    dismiss,
    handleInstall,
    openExternalBrowser,
    maybeOpenCameraNudge,
    dismissCameraNudge,
    closeCameraNudge,
  };
}
