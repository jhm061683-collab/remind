"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CAMERA_OPEN_TIMEOUT_MS = 5000;

type Props = {
  open: boolean;
  onCancel: () => void;
  onCapture: (file: File) => void;
  /**
   * getUserMedia 실패·타임아웃 후 네이티브 촬영이 필요할 때.
   * 사용자 제스처가 필요할 수 있으므로, 시트 안 「바로 촬영하기」에서만 호출한다.
   */
  onUseNativeCapture: () => void;
};

type Phase = "opening" | "ready" | "fallback";

/**
 * TYPE A 환경용 커스텀 후방 카메라.
 * 타임아웃·권한 오류 시 무한 로딩 금지 → 「바로 촬영하기」로 네이티브 폴백.
 */
export function CameraCaptureSheet({
  open,
  onCancel,
  onCapture,
  onUseNativeCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const [busy, setBusy] = useState(false);
  const fallbackFired = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  const goFallback = useCallback(() => {
    if (fallbackFired.current) return;
    fallbackFired.current = true;
    stopStream();
    setPhase("fallback");
  }, [stopStream]);

  useEffect(() => {
    if (!open) {
      fallbackFired.current = false;
      stopStream();
      return;
    }

    let cancelled = false;
    fallbackFired.current = false;

    async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error("CAMERA_TIMEOUT")), ms);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async function start() {
      await Promise.resolve();
      if (cancelled) return;
      setPhase("opening");
      setBusy(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        goFallback();
        return;
      }

      try {
        const tryConstraints: MediaStreamConstraints[] = [
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1920 },
            },
          },
          {
            audio: false,
            video: { facingMode: "environment" },
          },
          {
            audio: false,
            video: true,
          },
        ];

        let stream: MediaStream | null = null;
        let lastError: unknown;
        for (const constraints of tryConstraints) {
          try {
            stream = await withTimeout(
              navigator.mediaDevices.getUserMedia(constraints),
              CAMERA_OPEN_TIMEOUT_MS,
            );
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!stream) {
          throw lastError ?? new Error("CAMERA_UNAVAILABLE");
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          await withTimeout(video.play(), 3000);
        }
        if (cancelled) return;
        setPhase("ready");
      } catch {
        if (cancelled) return;
        goFallback();
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [open, goFallback]);

  function handleCancel() {
    stopStream();
    onCancel();
  }

  function handleNative() {
    stopStream();
    onUseNativeCapture();
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || phase !== "ready" || busy) return;
    setBusy(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("blob");
      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      stopStream();
      onCapture(file);
    } catch {
      goFallback();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="문제 촬영"
    >
      <div className="flex items-center justify-between px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 rounded-lg px-3 text-sm font-semibold touch-manipulation"
        >
          취소
        </button>
        <p className="text-sm font-bold">문제 촬영</p>
        <span className="w-14" />
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${phase === "ready" ? "" : "opacity-0"}`}
        />

        {phase === "opening" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            <p className="text-sm text-white/85">카메라 여는 중…</p>
            <button
              type="button"
              onClick={handleNative}
              className="mt-2 min-h-11 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-semibold text-white touch-manipulation"
            >
              바로 촬영하기
            </button>
          </div>
        ) : null}

        {phase === "fallback" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6">
            <p className="text-center text-base font-bold text-white">
              바로 촬영해 주세요
            </p>
            <p className="text-center text-sm text-white/70">
              휴대폰 카메라로 이어서 찍을 수 있어요.
            </p>
            <button
              type="button"
              onClick={handleNative}
              className="min-h-12 w-full max-w-xs rounded-xl bg-white px-4 text-base font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              바로 촬영하기
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-11 text-sm font-medium text-white/70 touch-manipulation"
            >
              닫기
            </button>
          </div>
        ) : null}
      </div>

      {phase === "ready" ? (
        <div className="flex items-center justify-center gap-6 border-t border-white/15 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleShutter()}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 touch-manipulation disabled:opacity-40 active:scale-95"
            aria-label="촬영"
          >
            <span className="h-12 w-12 rounded-full bg-white" />
          </button>
        </div>
      ) : (
        <div className="pb-[max(1rem,env(safe-area-inset-bottom))]" />
      )}
    </div>
  );

  return createPortal(dialog, document.body);
}

/** 커스텀 getUserMedia UI를 시도할 수 있는 최소 조건 (전략은 호출 측에서 결정) */
export function canUseGetUserMediaCamera(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

/** @deprecated canUseGetUserMediaCamera 사용 */
export function canUseRearCamera(): boolean {
  return canUseGetUserMediaCamera();
}

export { CAMERA_OPEN_TIMEOUT_MS };
