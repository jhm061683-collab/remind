"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  open: boolean;
  source: string;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = { x: number; y: number };

const MIN_SIZE = 24;

export function ImageCropDialog({
  open,
  source,
  onCancel,
  onApply,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop(null);
    setStart(null);
    setDragging(false);
  }, [open, source]);

  if (!open) return null;

  function pointInImage(event: ReactPointerEvent<HTMLDivElement>): Point {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };
    const rect = image.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
  }

  function beginCrop(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointInImage(event);
    setStart(point);
    setCrop({ x: point.x, y: point.y, width: 0, height: 0 });
    setDragging(true);
  }

  function updateCrop(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || !start) return;
    const point = pointInImage(event);
    setCrop({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function finishCrop(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    setStart(null);
  }

  function selectWholeImage() {
    const image = imageRef.current;
    if (!image) return;
    setCrop({
      x: 0,
      y: 0,
      width: image.clientWidth,
      height: image.clientHeight,
    });
  }

  async function applyCrop() {
    const displayed = imageRef.current;
    if (
      !displayed ||
      !crop ||
      crop.width < MIN_SIZE ||
      crop.height < MIN_SIZE
    ) {
      return;
    }

    const image = new Image();
    image.src = source;
    await image.decode();

    const scaleX = image.naturalWidth / displayed.clientWidth;
    const scaleY = image.naturalHeight / displayed.clientHeight;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sourceWidth = Math.round(crop.width * scaleX);
    const sourceHeight = Math.round(crop.height * scaleY);
    const maxOutputWidth = 1600;
    const outputScale = Math.min(1, maxOutputWidth / sourceWidth);
    const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(
      image,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  }

  const hasValidCrop =
    crop != null && crop.width >= MIN_SIZE && crop.height >= MIN_SIZE;

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/90 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="문제 사진 자르기"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between py-2 text-white">
        <div>
          <h2 className="font-bold">사진 자르기</h2>
          <p className="text-xs text-white/70">
            남길 영역을 손가락이나 마우스로 사각형으로 그리세요.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="px-2 py-1">
          닫기 ✕
        </button>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-slate-950 p-2">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <div className="relative inline-block max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={source}
              alt="자를 사진"
              onLoad={() => window.setTimeout(selectWholeImage, 0)}
              className="block max-h-[68vh] max-w-full select-none object-contain"
              draggable={false}
            />
            <div
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={beginCrop}
              onPointerMove={updateCrop}
              onPointerUp={finishCrop}
              onPointerCancel={finishCrop}
            >
              {crop ? (
                <>
                  <div
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.width,
                      height: crop.height,
                    }}
                  >
                    <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-sm bg-white" />
                    <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-sm bg-white" />
                    <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-sm bg-white" />
                    <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm bg-white" />
                  </div>
                  {hasValidCrop ? (
                    <span
                      className="absolute rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white"
                      style={{
                        left: crop.x,
                        top: Math.max(0, crop.y - 28),
                      }}
                    >
                      {Math.round(crop.width)} × {Math.round(crop.height)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 bg-slate-950">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] rounded-xl border border-white/30 font-semibold text-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={selectWholeImage}
            className="min-h-[48px] rounded-xl border border-white/30 font-semibold text-white"
          >
            전체 선택
          </button>
          <button
            type="button"
            disabled={!hasValidCrop}
            onClick={() => void applyCrop()}
            className="min-h-[48px] rounded-xl bg-white font-bold text-slate-950 disabled:opacity-40"
          >
            이 영역 사용
          </button>
        </div>
      </div>
    </div>
  );
}
