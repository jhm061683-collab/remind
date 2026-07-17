"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
};

function isLikelyValidImageSrc(src: string): boolean {
  if (!src?.trim()) return false;
  if (src.startsWith("blob:")) return false;
  return (
    src.startsWith("data:image/") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

export function QuestionImage({
  src,
  alt,
  className = "object-contain",
  fill,
  width,
  height,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!isLikelyValidImageSrc(src) || failed) {
    return (
      <div className="flex h-full min-h-[8rem] w-full flex-col items-center justify-center gap-1 bg-[var(--rm-accent-muted)] px-4 text-center text-sm text-[var(--rm-text-muted)]">
        <span className="text-2xl" aria-hidden>
          📷
        </span>
        <p>사진을 불러올 수 없어요</p>
        <p className="text-xs text-[var(--rm-text-faint)]">
          삭제 후 다시 올려 주세요.
        </p>
      </div>
    );
  }

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
