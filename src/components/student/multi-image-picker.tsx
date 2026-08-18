"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ImagePickButton } from "@/components/student/image-pick-button";
import { ImageEditSheet } from "@/components/student/image-edit-sheet";
import {
  CameraCaptureSheet,
  canUseGetUserMediaCamera,
} from "@/components/student/camera-capture-sheet";
import {
  CameraInstallNudge,
} from "@/components/pwa/install-app-prompt";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { readBrowserEnvironment } from "@/lib/pwa/browser-environment";
import { compressImage } from "@/lib/utils/compress-image";

type Page = {
  id: string;
  preview: string;
  file: File | null;
};

type Props = {
  label: string;
  hint?: string;
  onChange: (pages: Page[]) => void;
  onReadyChange?: (ready: boolean) => void;
  required?: boolean;
  maxImages?: number;
};

type Draft = {
  preview: string;
  file: File | null;
  replaceIndex?: number;
  fromCapture: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("invalid file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

async function prepareFile(original: File): Promise<{ file: File; dataUrl: string }> {
  let file = original;
  try {
    const compressed = await compressImage(file);
    if (compressed.size > 0 && compressed.size < file.size) {
      file = compressed;
    }
  } catch {
    // 원본 사용
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { file, dataUrl };
}

let pageIdCounter = 0;
function nextPageId() {
  pageIdCounter += 1;
  return `page-${pageIdCounter}`;
}

export function MultiImagePicker({
  label,
  hint,
  onChange,
  onReadyChange,
  required = false,
  maxImages = 5,
}: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [replaceCamOpen, setReplaceCamOpen] = useState(false);
  const [preferCustomCam] = useState(
    () => readBrowserEnvironment().cameraStrategy === "custom_get_user_media",
  );
  const replaceCaptureRef = useRef<HTMLInputElement>(null);
  const replaceAlbumRef = useRef<HTMLInputElement>(null);
  const pendingCaptureAfterNudge = useRef<(() => void) | null>(null);
  const nudgeCaptureRef = useRef<HTMLInputElement>(null);
  const {
    cameraNudgeOpen,
    maybeOpenCameraNudge,
    dismissCameraNudge,
    closeCameraNudge,
    openExternalBrowser,
  } = usePwaInstall();

  useEffect(() => {
    replaceCaptureRef.current?.setAttribute("capture", "environment");
    nudgeCaptureRef.current?.setAttribute("capture", "environment");
  }, []);

  const openNativeReplaceCapture = useCallback(() => {
    const el = replaceCaptureRef.current;
    if (!el) return;
    el.setAttribute("capture", "environment");
    el.click();
  }, []);

  const startReplaceCapture = useCallback(() => {
    if (preferCustomCam && canUseGetUserMediaCamera()) {
      setReplaceCamOpen(true);
      return;
    }
    openNativeReplaceCapture();
  }, [preferCustomCam, openNativeReplaceCapture]);

  const gateCapture = useCallback(() => {
    const allowed = maybeOpenCameraNudge();
    if (!allowed) {
      pendingCaptureAfterNudge.current = () => {
        const el = nudgeCaptureRef.current;
        if (!el) return;
        el.setAttribute("capture", "environment");
        el.click();
      };
      return false;
    }
    return true;
  }, [maybeOpenCameraNudge]);

  const handleNudgeContinueWeb = useCallback(() => {
    dismissCameraNudge();
    const run = pendingCaptureAfterNudge.current;
    pendingCaptureAfterNudge.current = null;
    // 모달 버튼 클릭 = 새 사용자 제스처 → 네이티브 촬영 가능
    window.setTimeout(() => run?.(), 0);
  }, [dismissCameraNudge]);

  const handleNudgeOpenApp = useCallback(() => {
    pendingCaptureAfterNudge.current = null;
    closeCameraNudge();
    openExternalBrowser();
  }, [closeCameraNudge, openExternalBrowser]);

  function emit(next: Page[]) {
    setPages(next);
    onChange(next);
    onReadyChange?.(next.length > 0);
  }

  async function openDraft(
    file: File,
    opts: { replaceIndex?: number; fromCapture: boolean },
  ) {
    setError(null);
    setStatus("사진 불러오는 중...");
    setMenuIndex(null);
    try {
      const prepared = await prepareFile(file);
      setDraft({
        preview: prepared.dataUrl,
        file: prepared.file,
        replaceIndex: opts.replaceIndex,
        fromCapture: opts.fromCapture,
      });
      setStatus(null);
    } catch {
      setError("사진을 불러오지 못했습니다. 다시 시도해 주세요.");
      setStatus(null);
    }
  }

  async function handleSelectMany(files: File[]) {
    setError(null);
    const remaining = Math.max(0, maxImages - pages.length);
    const selected = files.slice(0, remaining);

    if (selected.length === 0) {
      setError(`사진은 최대 ${maxImages}장까지 등록할 수 있어요.`);
      return;
    }

    setStatus(`${selected.length}장 불러오는 중...`);
    try {
      const preparedList: Page[] = [];
      for (const original of selected) {
        const prepared = await prepareFile(original);
        preparedList.push({
          id: nextPageId(),
          preview: prepared.dataUrl,
          file: prepared.file,
        });
        setStatus(`${preparedList.length}/${selected.length}장 불러오는 중...`);
      }

      if (preparedList.length === 1) {
        const only = preparedList[0]!;
        setDraft({
          preview: only.preview,
          file: only.file,
          fromCapture: false,
        });
        setStatus(null);
        return;
      }

      const first = preparedList[0]!;
      const rest = preparedList.slice(1);
      emit([...pages, ...rest]);
      setDraft({
        preview: first.preview,
        file: first.file,
        fromCapture: false,
      });
      setStatus(
        rest.length > 0 ? `✓ ${rest.length}장 추가 · 첫 장을 확인해 주세요` : null,
      );
      if (files.length > selected.length) {
        setError(
          `최대 ${maxImages}장까지만 등록되어 나머지 ${files.length - selected.length}장은 제외했어요.`,
        );
      }
    } catch {
      setError("사진을 불러오지 못했습니다. 다시 시도해 주세요.");
      setStatus(null);
    }
  }

  function confirmDraft(dataUrl: string) {
    if (!draft) return;
    const page: Page = {
      id: nextPageId(),
      preview: dataUrl,
      file: null,
    };
    if (draft.replaceIndex !== undefined) {
      const next = [...pages];
      next[draft.replaceIndex] = page;
      emit(next);
      setStatus("✓ 사진을 바꿨어요");
    } else {
      emit([...pages, page]);
      setStatus("✓ 사진 추가됨");
    }
    setDraft(null);
  }

  function removePage(index: number) {
    const next = pages.filter((_, i) => i !== index);
    emit(next);
    setStatus(next.length > 0 ? `✓ ${next.length}장` : null);
    setMenuIndex(null);
  }

  return (
    <div data-tour-id="student-upload-photos">
      <input
        ref={nudgeCaptureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void openDraft(file, { fromCapture: true });
        }}
      />

      <CameraInstallNudge
        open={cameraNudgeOpen}
        onOpenApp={handleNudgeOpenApp}
        onContinueWeb={handleNudgeContinueWeb}
      />

      {draft ? (
        <ImageEditSheet
          open
          source={draft.preview}
          allowRetake
          onCancel={() => setDraft(null)}
          onConfirm={confirmDraft}
          onRetake={(file) => {
            void openDraft(file, {
              replaceIndex: draft.replaceIndex,
              fromCapture: true,
            });
          }}
        />
      ) : null}

      <input
        ref={replaceCaptureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || menuIndex === null) return;
          void openDraft(file, { replaceIndex: menuIndex, fromCapture: true });
        }}
      />
      <input
        ref={replaceAlbumRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || menuIndex === null) return;
          void openDraft(file, { replaceIndex: menuIndex, fromCapture: false });
        }}
      />

      <CameraCaptureSheet
        open={replaceCamOpen}
        onCancel={() => setReplaceCamOpen(false)}
        onUseNativeCapture={() => {
          setReplaceCamOpen(false);
          openNativeReplaceCapture();
        }}
        onCapture={(file) => {
          const idx = menuIndex;
          setReplaceCamOpen(false);
          if (idx === null) return;
          void openDraft(file, { replaceIndex: idx, fromCapture: true });
        }}
      />

      {label ? (
        <p className="mb-1 text-sm font-medium text-[var(--rm-text)]">
          {label}
          {required ? (
            <span className="text-[var(--rm-danger)]"> *</span>
          ) : null}
        </p>
      ) : null}
      {hint ? (
        <p className="mb-2 text-xs text-[var(--rm-text-muted)]">{hint}</p>
      ) : null}

      {status ? (
        <p className="rm-pick-status mb-2 rounded-lg px-3 py-2 text-sm font-medium">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rm-pick-error mb-2 rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      {pages.length > 0 ? (
        <div className="space-y-2">
          {pages.map((page, index) => {
            const open = menuIndex === index;
            return (
              <div
                key={page.id}
                className="relative overflow-hidden rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]"
              >
                <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                  {index + 1}장
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.preview}
                  alt={`${label || "문제"} ${index + 1}`}
                  className="max-h-52 w-full object-contain"
                />

                {open ? (
                  <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/55 p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg bg-white/95 px-2 py-2.5 text-xs font-bold text-[var(--rm-text)]"
                        onClick={() => replaceAlbumRef.current?.click()}
                      >
                        앨범에서 교체
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-white/95 px-2 py-2.5 text-xs font-bold text-[var(--rm-text)]"
                        onClick={startReplaceCapture}
                      >
                        다시 촬영
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--rm-danger)] px-2 py-2.5 text-xs font-bold text-white"
                        onClick={() => removePage(index)}
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-black/50 px-2 py-2.5 text-xs font-bold text-white"
                        onClick={() => setMenuIndex(null)}
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMenuIndex(index)}
                    className="absolute inset-0 z-10"
                    aria-label={`${index + 1}장 교체·삭제`}
                  >
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                      눌러서 교체·삭제
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {pages.length < maxImages ? (
            <div className="grid grid-cols-2 gap-2">
              <ImagePickButton
                text="사진 추가 · 촬영"
                capture
                variant="primary"
                onBeforeCapture={gateCapture}
                onPick={(f) => void openDraft(f, { fromCapture: true })}
              />
              <ImagePickButton
                text="사진 추가 · 앨범"
                variant="secondary"
                onPick={(f) => void openDraft(f, { fromCapture: false })}
                onPickMany={(files) => void handleSelectMany(files)}
                multiple
              />
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--rm-text-muted)]">
              최대 {maxImages}장까지 올릴 수 있어요
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <ImagePickButton
            text="촬영"
            capture
            variant="primary"
            tourId="student-upload-camera"
            onBeforeCapture={gateCapture}
            onPick={(f) => void openDraft(f, { fromCapture: true })}
          />
          <ImagePickButton
            text="앨범"
            variant="secondary"
            onPick={(f) => void openDraft(f, { fromCapture: false })}
            onPickMany={(files) => void handleSelectMany(files)}
            multiple
          />
        </div>
      )}
    </div>
  );
}

export type { Page as ImagePage };
