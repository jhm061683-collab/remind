"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

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

/** move = 영역 통째로 이동, 나머지는 잡은 변/모서리만 이동 */
type DragMode = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

type DragState = {
  mode: DragMode;
  startPoint: Point;
  startCrop: CropRect;
  bounds: { width: number; height: number };
};

const MIN_SIZE = 24;
/** 손가락으로 변/모서리를 잡기 쉬운 히트 반경(px) */
const HANDLE_HIT = 22;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ImageCropDialog({
  open,
  source,
  onCancel,
  onApply,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPointRef = useRef<Point | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop(null);
    dragRef.current = null;
    pendingPointRef.current = null;
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [open, source]);

  if (!open) return null;

  function pointInImage(event: ReactPointerEvent<HTMLDivElement>): Point {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };
    const rect = image.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    };
  }

  /** 포인터 위치로 어느 변/모서리를 잡았는지 판정 */
  function hitTest(point: Point, rect: CropRect): DragMode | null {
    const nearLeft = Math.abs(point.x - rect.x) <= HANDLE_HIT;
    const nearRight = Math.abs(point.x - (rect.x + rect.width)) <= HANDLE_HIT;
    const nearTop = Math.abs(point.y - rect.y) <= HANDLE_HIT;
    const nearBottom =
      Math.abs(point.y - (rect.y + rect.height)) <= HANDLE_HIT;
    const withinX =
      point.x >= rect.x - HANDLE_HIT &&
      point.x <= rect.x + rect.width + HANDLE_HIT;
    const withinY =
      point.y >= rect.y - HANDLE_HIT &&
      point.y <= rect.y + rect.height + HANDLE_HIT;

    if (nearTop && nearLeft) return "nw";
    if (nearTop && nearRight) return "ne";
    if (nearBottom && nearLeft) return "sw";
    if (nearBottom && nearRight) return "se";
    if (nearTop && withinX) return "n";
    if (nearBottom && withinX) return "s";
    if (nearLeft && withinY) return "w";
    if (nearRight && withinY) return "e";

    const inside =
      point.x > rect.x &&
      point.x < rect.x + rect.width &&
      point.y > rect.y &&
      point.y < rect.y + rect.height;
    return inside ? "move" : null;
  }

  function applyDrag(drag: DragState, point: Point): CropRect {
    const dx = point.x - drag.startPoint.x;
    const dy = point.y - drag.startPoint.y;
    const start = drag.startCrop;
    const { width: bw, height: bh } = drag.bounds;

    if (drag.mode === "move") {
      return {
        x: clamp(start.x + dx, 0, bw - start.width),
        y: clamp(start.y + dy, 0, bh - start.height),
        width: start.width,
        height: start.height,
      };
    }

    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;

    if (drag.mode.includes("w")) {
      left = clamp(start.x + dx, 0, right - MIN_SIZE);
    }
    if (drag.mode.includes("e")) {
      right = clamp(start.x + start.width + dx, left + MIN_SIZE, bw);
    }
    if (drag.mode.includes("n")) {
      top = clamp(start.y + dy, 0, bottom - MIN_SIZE);
    }
    if (drag.mode.includes("s")) {
      bottom = clamp(start.y + start.height + dy, top + MIN_SIZE, bh);
    }

    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image || !crop) return;
    const point = pointInImage(event);
    const mode = hitTest(point, crop);
    if (!mode) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startPoint: point,
      startCrop: crop,
      bounds: { width: image.clientWidth, height: image.clientHeight },
    };
  }

  function updateDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    pendingPointRef.current = pointInImage(event);
    // 고주사율 터치 기기에서 pointermove마다 렌더링하지 않고
    // 화면 프레임당 한 번만 선택 영역을 갱신한다.
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const activeDrag = dragRef.current;
      const point = pendingPointRef.current;
      if (!activeDrag || !point) return;
      setCrop(applyDrag(activeDrag, point));
    });
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag) setCrop(applyDrag(drag, pointInImage(event)));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    pendingPointRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
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

  const dialog = (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-label="문제 사진 자르기"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between py-2 text-white">
        <div>
          <h2 className="font-bold">사진 자르기</h2>
          <p className="text-xs text-white/70">
            테두리의 점을 끌어 영역을 조절하세요. 안쪽을 끌면 이동해요.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="px-2 py-1">
          닫기 ✕
        </button>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-slate-950 p-2">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div className="relative inline-block max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={source}
              alt="자를 사진"
              onLoad={() => window.setTimeout(selectWholeImage, 0)}
              className="block max-h-[62vh] max-w-full select-none object-contain"
              draggable={false}
            />
            <div
              className="absolute inset-0 touch-none"
              onPointerDown={beginDrag}
              onPointerMove={updateDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              {crop ? (
                <>
                  <div
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.width,
                      height: crop.height,
                    }}
                  >
                    {/* 모서리 핸들 */}
                    <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-slate-900/40 bg-white" />
                    <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-slate-900/40 bg-white" />
                    <span className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-slate-900/40 bg-white" />
                    <span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-slate-900/40 bg-white" />
                    {/* 변 중앙 핸들 — 각 변을 독립적으로 움직일 수 있다는 시각 신호 */}
                    <span className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-white" />
                    <span className="absolute -bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-white" />
                    <span className="absolute -left-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-white" />
                    <span className="absolute -right-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-white" />
                  </div>
                  {hasValidCrop ? (
                    <span
                      className="pointer-events-none absolute rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white"
                      style={{
                        left: crop.x,
                        top: crop.y > 30 ? crop.y - 28 : crop.y + 6,
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

        <div className="mt-2 grid shrink-0 grid-cols-3 gap-2 bg-slate-950">
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

  // 레이아웃 내부(z-index 스태킹 컨텍스트)에서 벗어나 헤더·하단 탭 위에 뜨도록
  // body에 직접 렌더링한다.
  return createPortal(dialog, document.body);
}
