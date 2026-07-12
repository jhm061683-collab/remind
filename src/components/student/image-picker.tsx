"use client";

import { useState } from "react";
import { ImagePickButton } from "@/components/student/image-pick-button";
import { compressImage } from "@/lib/utils/compress-image";

type Props = {
  label: string;
  hint?: string;
  onChange: (file: File | null, previewUrl: string | null) => void;
  onReadyChange?: (ready: boolean) => void;
  required?: boolean;
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

export function ImagePicker({
  label,
  hint,
  onChange,
  onReadyChange,
  required = false,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePreview(url: string | null, file: File | null) {
    setPreview(url);
    onChange(file, url);
    onReadyChange?.(Boolean(url));
  }

  async function handleSelect(selected: File) {
    setError(null);
    setStatus("사진 불러오는 중...");

    try {
      const dataUrl = await readFileAsDataUrl(selected);
      updatePreview(dataUrl, selected);
      setStatus("✓ 사진 선택됨 — 등록하기를 누르세요");

      try {
        const compressed = await compressImage(selected);
        if (compressed.size > 0 && compressed.size < selected.size) {
          const compressedUrl = await readFileAsDataUrl(compressed);
          updatePreview(compressedUrl, compressed);
        }
      } catch {
        // 원본 그대로 사용
      }
    } catch {
      setError("사진을 불러오지 못했습니다. 다시 시도해 주세요.");
      updatePreview(null, null);
      setStatus(null);
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[var(--rm-text)]">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </p>
      {hint ? <p className="mb-2 text-xs text-[var(--rm-text-muted)]">{hint}</p> : null}

      {status ? (
        <p className="rm-pick-status mb-2 rounded-lg px-3 py-2 text-sm font-bold">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rm-pick-error mb-2 rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="max-h-72 w-full rounded-xl border-2 border-[var(--rm-accent)]/40 bg-[var(--rm-bg-elevated)] object-contain"
          />
          <div className="grid grid-cols-2 gap-2">
            <ImagePickButton
              text="📸 다시 촬영"
              capture
              variant="primary"
              onPick={(f) => void handleSelect(f)}
            />
            <ImagePickButton
              text="🖼️ 다른 사진"
              variant="secondary"
              onPick={(f) => void handleSelect(f)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ImagePickButton
            text="📸 촬영"
            capture
            variant="primary"
            onPick={(f) => void handleSelect(f)}
          />
          <ImagePickButton
            text="🖼️ 앨범"
            variant="secondary"
            onPick={(f) => void handleSelect(f)}
          />
        </div>
      )}
    </div>
  );
}
