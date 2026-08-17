"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageCropDialog } from "@/components/student/image-crop-dialog";

type Props = {
  open: boolean;
  source: string;
  /** 촬영으로 들어온 경우 다시 찍기 표시 */
  allowRetake?: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  onRetake?: (file: File) => void;
};

function rotateDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

/** 카카오톡처럼 완료 전에 돌리기·자르기·다시찍기 */
export function ImageEditSheet({
  open,
  source,
  allowRetake = true,
  onCancel,
  onConfirm,
  onRetake,
}: Props) {
  const [preview, setPreview] = useState(source);
  const [cropOpen, setCropOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const retakeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && source) {
      setPreview(source);
      setCropOpen(false);
      setBusy(false);
    }
    if (!open) {
      setPreview("");
      setCropOpen(false);
      setBusy(false);
    }
  }, [open, source]);

  const displaySrc = preview || source;
  if (!open || !displaySrc) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="사진 편집"
    >
      <div className="flex items-center justify-between px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg px-2 text-sm font-semibold"
        >
          취소
        </button>
        <p className="text-sm font-bold">사진 확인</p>
        <button
          type="button"
          disabled={busy || !displaySrc}
          onClick={() => onConfirm(displaySrc)}
          className="min-h-10 rounded-lg px-2 text-sm font-bold text-sky-300 disabled:opacity-40"
        >
          완료
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt="편집 중"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-white/15 bg-black px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {allowRetake && onRetake ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => retakeRef.current?.click()}
            className="min-h-12 rounded-xl border border-white/25 text-sm font-bold text-white disabled:opacity-40"
          >
            다시 찍기
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void rotateDataUrl(displaySrc)
              .then((next) => setPreview(next))
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
          className="min-h-12 rounded-xl border border-white/25 text-sm font-bold text-white disabled:opacity-40"
        >
          돌리기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setCropOpen(true)}
          className="min-h-12 rounded-xl border border-white/25 text-sm font-bold text-white disabled:opacity-40"
        >
          자르기
        </button>
      </div>

      <input
        ref={retakeRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && onRetake) onRetake(file);
        }}
      />

      {cropOpen && displaySrc ? (
        <ImageCropDialog
          open={cropOpen}
          source={displaySrc}
          onCancel={() => setCropOpen(false)}
          onApply={(cropped) => {
            setPreview(cropped);
            setCropOpen(false);
          }}
        />
      ) : null}
    </div>
  );

  return createPortal(dialog, document.body);
}
