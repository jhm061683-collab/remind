"use client";

import { useState } from "react";
import { QuestionImage } from "@/components/student/question-image";
import { ImageLightbox } from "@/components/ui/image-lightbox";

type Props = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  zoomable?: boolean;
};

/** 단일 사진 + 클릭 확대 */
export function ZoomableQuestionImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  zoomable = true,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!zoomable || !src) {
    return (
      <QuestionImage
        src={src}
        alt={alt}
        className={className}
        fill={fill}
        width={width}
        height={height}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className={`relative block w-full cursor-zoom-in ${fill ? "h-full" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={`${alt} 확대 보기`}
      >
        <QuestionImage
          src={src}
          alt={alt}
          className={className}
          fill={fill}
          width={width}
          height={height}
        />
      </button>
      <ImageLightbox
        urls={[src]}
        alt={alt}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
