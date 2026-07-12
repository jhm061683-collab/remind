"use client";

import { useRef, type ChangeEvent } from "react";

type Variant = "primary" | "secondary" | "outline";

type Props = {
  text: string;
  capture?: boolean;
  onPick: (file: File) => void;
  variant: Variant;
};

export function ImagePickButton({ text, capture, onPick, variant }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.size > 0) onPick(file);
    setTimeout(() => {
      event.target.value = "";
    }, 500);
  }

  return (
    <label className={`relative flex cursor-pointer items-center justify-center touch-manipulation ${variantClass}`}>
      {text}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ fontSize: "16px" }}
      />
    </label>
  );
}
