"use client";

import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { QuestionImage } from "@/components/student/question-image";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import type { StoredQuestion } from "@/lib/storage/questions";
import { getQuestionImageUrls } from "@/lib/utils/question-images";

type Props = {
  question: Pick<StoredQuestion, "imageDataUrl" | "extraImageDataUrls">;
  alt?: string;
  /** 카드 상단 썸네일(한 장씩 넘김) */
  thumbnail?: boolean;
  fill?: boolean;
  className?: string;
  imageClassName?: string;
  /** 클릭 시 확대 보기 (기본 true) */
  zoomable?: boolean;
};

export function QuestionImages({
  question,
  alt = "문제",
  thumbnail = false,
  fill,
  className,
  imageClassName = "object-contain",
  zoomable = true,
}: Props) {
  const urls = getQuestionImageUrls(question);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const safeIndex = urls.length === 0 ? 0 : Math.min(index, urls.length - 1);
  const current = urls[safeIndex];
  const useCarousel = Boolean(thumbnail || fill) || urls.length === 1;

  if (urls.length === 0) {
    return (
      <div className={fill || thumbnail ? "absolute inset-0" : className}>
        <QuestionImage src="" alt={alt} fill={fill || thumbnail} className={imageClassName} />
      </div>
    );
  }

  function go(delta: number, e?: MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    setIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return urls.length - 1;
      if (next >= urls.length) return 0;
      return next;
    });
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null || urls.length < 2) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  }

  function openLightbox(at = safeIndex) {
    if (!zoomable) return;
    setIndex(at);
    setLightboxOpen(true);
  }

  if (useCarousel) {
    return (
      <>
        <div
          role={zoomable ? "button" : undefined}
          tabIndex={zoomable ? 0 : undefined}
          aria-label={zoomable ? "사진 확대 보기" : undefined}
          className={
            fill || thumbnail
              ? `relative h-full w-full touch-pan-y ${zoomable ? "cursor-zoom-in" : ""} ${className ?? ""}`
              : `${zoomable ? "cursor-zoom-in" : ""} ${className ?? ""}`
          }
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => openLightbox(safeIndex)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openLightbox(safeIndex);
            }
          }}
        >
          <QuestionImage
            src={current!}
            alt={urls.length > 1 ? `${alt} ${safeIndex + 1}` : alt}
            fill={Boolean(fill || thumbnail)}
            className={imageClassName}
          />

          {urls.length > 1 ? (
            <>
              <span className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                {safeIndex + 1}/{urls.length}
              </span>
              <button
                type="button"
                aria-label="이전 사진"
                onClick={(e) => go(-1, e)}
                className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-sm font-bold text-white backdrop-blur-sm"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="다음 사진"
                onClick={(e) => go(1, e)}
                className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-sm font-bold text-white backdrop-blur-sm"
              >
                ›
              </button>
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
                {urls.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === safeIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
        <ImageLightbox
          urls={urls}
          initialIndex={safeIndex}
          alt={alt}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className={className ?? "space-y-2"}>
        {urls.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            className={`relative block w-full ${zoomable ? "cursor-zoom-in" : ""}`}
            onClick={() => openLightbox(i)}
            aria-label={`${alt} ${i + 1} 확대`}
          >
            <span className="absolute left-2 top-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
              {i + 1}/{urls.length}
            </span>
            <QuestionImage
              src={url}
              alt={`${alt} ${i + 1}`}
              className={imageClassName}
            />
          </button>
        ))}
      </div>
      <ImageLightbox
        urls={urls}
        initialIndex={safeIndex}
        alt={alt}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
