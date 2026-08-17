"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  CameraCaptureSheet,
  canUseGetUserMediaCamera,
} from "@/components/student/camera-capture-sheet";
import {
  readBrowserEnvironment,
  type CameraStrategy,
} from "@/lib/pwa/browser-environment";

type Variant = "primary" | "secondary" | "outline";

type Props = {
  text: string;
  capture?: boolean;
  onPick: (file: File) => void;
  onPickMany?: (files: File[]) => void;
  multiple?: boolean;
  variant: Variant;
  /** 촬영 클릭 직전 (인앱 설치 유도 등). false 반환 시 촬영 중단 */
  onBeforeCapture?: () => boolean | void;
  tourId?: string;
};

export function ImagePickButton({
  text,
  capture,
  onPick,
  onPickMany,
  multiple = false,
  variant,
  onBeforeCapture,
  tourId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [strategy, setStrategy] = useState<CameraStrategy>(
    "custom_get_user_media",
  );

  useEffect(() => {
    setStrategy(readBrowserEnvironment().cameraStrategy);
  }, []);

  const variantClass =
    variant === "primary"
      ? capture
        ? "rm-pick-btn rm-pick-btn--primary rm-pick-btn--capture"
        : "rm-pick-btn rm-pick-btn--primary"
      : variant === "secondary"
        ? "rm-pick-btn rm-pick-btn--secondary"
        : capture
          ? "rm-pick-btn rm-pick-btn--outline rm-pick-btn--capture-outline"
          : "rm-pick-btn rm-pick-btn--outline";

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (capture) el.setAttribute("capture", "environment");
    else el.removeAttribute("capture");
  }, [capture, camOpen]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter(
      (file) => file.size > 0,
    );
    if (multiple && onPickMany && files.length > 0) {
      onPickMany(files);
    } else if (files[0]) {
      onPick(files[0]);
    }
    setTimeout(() => {
      event.target.value = "";
    }, 500);
  }

  /** 반드시 사용자 제스처 안에서 호출 */
  const openNativeCapture = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setAttribute("capture", "environment");
    el.click();
  }, []);

  function handleCaptureClick() {
    setPressing(true);
    window.setTimeout(() => setPressing(false), 180);

    if (onBeforeCapture && onBeforeCapture() === false) {
      return;
    }

    // TYPE B: 인앱 등 → 네이티브 촬영을 같은 탭 제스처로 즉시 실행
    const useCustom =
      strategy === "custom_get_user_media" && canUseGetUserMediaCamera();

    if (capture && useCustom) {
      setCamOpen(true);
      return;
    }
    openNativeCapture();
  }

  if (capture) {
    return (
      <>
        <button
          type="button"
          data-tour-id={tourId}
          onClick={handleCaptureClick}
          aria-busy={pressing || camOpen}
          className={`relative flex cursor-pointer items-center justify-center touch-manipulation transition active:scale-[0.98] ${variantClass} ${
            pressing ? "opacity-80 ring-2 ring-white/40" : ""
          }`}
        >
          {pressing ? "준비 중…" : text}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
        <CameraCaptureSheet
          open={camOpen}
          onCancel={() => setCamOpen(false)}
          onUseNativeCapture={() => {
            setCamOpen(false);
            // 시트 버튼 클릭 = 새 사용자 제스처
            openNativeCapture();
          }}
          onCapture={(file) => {
            setCamOpen(false);
            onPick(file);
          }}
        />
      </>
    );
  }

  return (
    <label
      className={`relative flex cursor-pointer items-center justify-center touch-manipulation ${variantClass}`}
    >
      {text}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ fontSize: "16px" }}
      />
    </label>
  );
}
