"use client";

import { useState } from "react";
import { ImagePickButton } from "@/components/student/image-pick-button";
import { compressImage } from "@/lib/utils/compress-image";

type Page = {
  id: string;
  preview: string;
  file: File | null;
};

type Props = {
  label: string;
  hint?: string;
  onChange: (pages: Page[]) => void;
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

let pageIdCounter = 0;
function nextPageId() {
  pageIdCounter += 1;
  return `page-${pageIdCounter}`;
}

export function MultiImagePicker({
  label,
  hint,
  onChange,
  onReadyChange,
  required = false,
}: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function emit(next: Page[]) {
    setPages(next);
    onChange(next);
    onReadyChange?.(next.length > 0);
  }

  async function handleSelect(file: File, replaceIndex?: number) {
    setError(null);
    setStatus("사진 불러오는 중...");

    try {
      let dataUrl = await readFileAsDataUrl(file);
      try {
        const compressed = await compressImage(file);
        if (compressed.size > 0 && compressed.size < file.size) {
          dataUrl = await readFileAsDataUrl(compressed);
          file = compressed;
        }
      } catch {
        // 원본 사용
      }

      const page: Page = { id: nextPageId(), preview: dataUrl, file };

      if (replaceIndex !== undefined) {
        const next = [...pages];
        next[replaceIndex] = page;
        emit(next);
      } else {
        emit([...pages, page]);
      }

      setStatus(
        pages.length + (replaceIndex === undefined ? 1 : 0) > 0
          ? `✓ ${replaceIndex !== undefined ? "교체" : "추가"}됨`
          : "✓ 사진 선택됨",
      );
    } catch {
      setError("사진을 불러오지 못했습니다. 다시 시도해 주세요.");
      setStatus(null);
    }
  }

  function removePage(index: number) {
    const next = pages.filter((_, i) => i !== index);
    emit(next);
    setStatus(next.length > 0 ? `✓ ${next.length}장` : null);
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[var(--rm-text)]">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </p>
      {hint ? <p className="mb-2 text-xs text-[var(--rm-text-muted)]">{hint}</p> : null}

      {status ? (
        <p className="rm-pick-status mb-2 rounded-lg px-3 py-2 text-sm font-medium">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rm-pick-error mb-2 rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      {pages.length > 0 ? (
        <div className="space-y-3">
          {pages.map((page, index) => (
            <div key={page.id} className="relative">
              <span className="absolute left-2 top-2 z-10 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                {index + 1}장
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.preview}
                alt={`${label} ${index + 1}`}
                className="max-h-64 w-full rounded-xl border-2 border-[var(--rm-accent)]/40 bg-[var(--rm-bg-elevated)] object-contain"
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ImagePickButton
                  text="다시 촬영"
                  capture
                  variant="outline"
                  onPick={(f) => void handleSelect(f, index)}
                />
                <ImagePickButton
                  text="교체"
                  variant="outline"
                  onPick={(f) => void handleSelect(f, index)}
                />
                <button
                  type="button"
                  onClick={() => removePage(index)}
                  className="min-h-12 rounded-[var(--rm-radius-md)] border border-red-400/30 bg-red-500/10 text-sm font-bold text-red-300"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}

          {pages.length < 2 ? (
            <div className="grid grid-cols-2 gap-2">
              <ImagePickButton
                text="📸 페이지 추가 촬영"
                capture
                variant="primary"
                onPick={(f) => void handleSelect(f)}
              />
              <ImagePickButton
                text="🖼️ 앨범에서 추가"
                variant="secondary"
                onPick={(f) => void handleSelect(f)}
              />
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--rm-text-muted)]">
              문제 사진은 최대 2장까지 올릴 수 있어요.
            </p>
          )}
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

export type { Page as ImagePage };
