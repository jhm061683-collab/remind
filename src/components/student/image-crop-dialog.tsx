"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  source: string;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void;
};

export function ImageCropDialog({
  open,
  source,
  onCancel,
  onApply,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setCenterX(50);
    setCenterY(50);
  }, [open, source]);

  if (!open) return null;

  async function applyCrop() {
    const image = new Image();
    image.src = source;
    await image.decode();

    const aspect = 4 / 3;
    let cropWidth = image.naturalWidth / zoom;
    let cropHeight = cropWidth / aspect;
    if (cropHeight > image.naturalHeight / zoom) {
      cropHeight = image.naturalHeight / zoom;
      cropWidth = cropHeight * aspect;
    }

    const maxX = Math.max(0, image.naturalWidth - cropWidth);
    const maxY = Math.max(0, image.naturalHeight - cropHeight);
    const sx = (centerX / 100) * maxX;
    const sy = (centerY / 100) * maxY;
    const maxOutputWidth = 1600;
    const outputWidth = Math.min(maxOutputWidth, Math.round(cropWidth));
    const outputHeight = Math.round(outputWidth / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(
      image,
      sx,
      sy,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
    onApply(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/85 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="문제 사진 자르기"
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-between py-2 text-white">
        <h2 className="font-bold">사진 자르기</h2>
        <button type="button" onClick={onCancel} className="px-2 py-1">
          닫기 ✕
        </button>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source}
            alt="자를 사진 미리보기"
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: `${centerX}% ${centerY}%`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 border-2 border-white/90" />
          <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/40" />
          <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/40" />
          <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/40" />
          <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/40" />
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            확대
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block">
            좌우 위치
            <input
              type="range"
              min={0}
              max={100}
              value={centerX}
              onChange={(event) => setCenterX(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block">
            상하 위치
            <input
              type="range"
              min={0}
              max={100}
              value={centerY}
              onChange={(event) => setCenterY(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] rounded-xl border border-slate-300 font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void applyCrop()}
            className="min-h-[48px] rounded-xl bg-blue-700 font-bold text-white"
          >
            이대로 자르기
          </button>
        </div>
      </div>
    </div>
  );
}
