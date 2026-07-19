"use client";

import { useRef, type ChangeEvent } from "react";

type Variant = "primary" | "secondary" | "outline";

type Props = {
  text: string;
  capture?: boolean;
  onPick: (file: File) => void;
  onPickMany?: (files: File[]) => void;
  multiple?: boolean;
  variant: Variant;
};

export function ImagePickButton({
  text,
  capture,
  onPick,
  onPickMany,
  multiple = false,
  variant,
}: Props) {
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

  return (
    <label className={`relative flex cursor-pointer items-center justify-center touch-manipulation ${variantClass}`}>
      {text}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ fontSize: "16px" }}
      />
    </label>
  );
}
