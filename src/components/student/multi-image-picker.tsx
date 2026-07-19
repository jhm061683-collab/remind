"use client";

import { useState } from "react";
import { ImagePickButton } from "@/components/student/image-pick-button";
import { ImageCropDialog } from "@/components/student/image-crop-dialog";
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
  maxImages?: number;
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
  maxImages = 5,
}: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);

  function emit(next: Page[]) {
    setPages(next);
    onChange(next);
    onReadyChange?.(next.length > 0);
  }

  async function handleSelect(file: File, replaceIndex?: number) {
    setError(null);
    setStatus("사진 불러오는 중...");

    try {
      try {
        const compressed = await compressImage(file);
        if (compressed.size > 0 && compressed.size < file.size) {
          file = compressed;
        }
      } catch {
        // 원본 사용
      }
      // 원본 전체를 base64로 읽은 뒤 압축하면 iOS에서 원본+압축본이 동시에
      // 메모리에 남는다. 반드시 압축할 파일을 결정한 다음 한 번만 읽는다.
      const dataUrl = await readFileAsDataUrl(file);

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

  async function handleSelectMany(files: File[]) {
    setError(null);
    const remaining = Math.max(0, maxImages - pages.length);
    const selected = files.slice(0, remaining);

    if (selected.length === 0) {
      setError(`사진은 최대 ${maxImages}장까지 등록할 수 있어요.`);
      return;
    }

    setStatus(`${selected.length}장 불러오는 중...`);
    try {
      const added: Page[] = [];
      // Promise.all로 5장을 동시에 디코딩하면 iOS Safari의 메모리 상한을
      // 쉽게 넘는다. 한 장씩 압축·직렬화하여 피크 메모리를 제한한다.
      for (const original of selected) {
        let file = original;
        try {
          const compressed = await compressImage(file);
          if (compressed.size > 0 && compressed.size < file.size) {
            file = compressed;
          }
        } catch {
          // 압축을 지원하지 않는 형식은 원본을 사용한다.
        }
        const dataUrl = await readFileAsDataUrl(file);
        added.push({ id: nextPageId(), preview: dataUrl, file });
        setStatus(`${added.length}/${selected.length}장 불러오는 중...`);
      }

      const next = [...pages, ...added];
      emit(next);
      setStatus(`✓ ${next.length}장 선택됨`);
      if (files.length > selected.length) {
        setError(
          `최대 ${maxImages}장까지만 등록되어 나머지 ${files.length - selected.length}장은 제외했어요.`,
        );
      }
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
      <ImageCropDialog
        open={cropIndex !== null}
        source={cropIndex !== null ? (pages[cropIndex]?.preview ?? "") : ""}
        onCancel={() => setCropIndex(null)}
        onApply={(croppedDataUrl) => {
          if (cropIndex === null) return;
          const next = [...pages];
          const current = next[cropIndex];
          if (!current) return;
          next[cropIndex] = {
            ...current,
            preview: croppedDataUrl,
            file: null,
          };
          emit(next);
          setCropIndex(null);
          setStatus("✓ 사진을 잘랐어요");
        }}
      />
      {label ? (
        <p className="mb-1 text-sm font-medium text-[var(--rm-text)]">
          {label}
          {required ? (
            <span className="text-[var(--rm-danger)]"> *</span>
          ) : null}
        </p>
      ) : null}
      {hint ? (
        <p className="mb-2 text-xs text-[var(--rm-text-muted)]">{hint}</p>
      ) : null}

      {pages.length === 0 ? (
        <p className="mb-2 rounded-lg bg-[var(--rm-info-bg)] px-3 py-2 text-xs font-medium text-[var(--rm-text-on-info)]">
          밝은 곳에서 문제가 화면에 꽉 차게, 또렷하게 찍어 주세요.
        </p>
      ) : null}

      {status ? (
        <p className="rm-pick-status mb-2 rounded-lg px-3 py-2 text-sm font-medium">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rm-pick-error mb-2 rounded-lg px-3 py-2 text-sm">{error}</p>
      ) : null}

      {pages.length > 0 ? (
        <div className="space-y-2">
          {pages.map((page, index) => (
            <div key={page.id} className="relative">
              <span className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                {index + 1}장
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.preview}
                alt={`${label || "문제"} ${index + 1}`}
                className="max-h-52 w-full rounded-xl border border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] object-contain"
              />
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                <ImagePickButton
                  text="다시 찍기"
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
                  onClick={() => setCropIndex(index)}
                  className="min-h-11 rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] bg-[var(--rm-surface)] text-sm font-bold text-[var(--rm-text)]"
                >
                  자르기
                </button>
                <button
                  type="button"
                  onClick={() => removePage(index)}
                  className="min-h-11 rounded-[var(--rm-radius-md)] border border-[var(--rm-error-border)] bg-[var(--rm-error-bg)] text-sm font-bold text-[var(--rm-text-on-error)]"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}

          {pages.length < maxImages ? (
            <div className="grid grid-cols-2 gap-2">
              <ImagePickButton
                text="장 추가 촬영"
                capture
                variant="primary"
                onPick={(f) => void handleSelect(f)}
              />
              <ImagePickButton
                text="앨범에서 추가"
                variant="secondary"
                onPick={(f) => void handleSelect(f)}
                onPickMany={(files) => void handleSelectMany(files)}
                multiple
              />
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--rm-text-muted)]">
              최대 {maxImages}장까지 올릴 수 있어요
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <ImagePickButton
            text="촬영"
            capture
            variant="primary"
            onPick={(f) => void handleSelect(f)}
          />
          <ImagePickButton
            text="앨범"
            variant="secondary"
            onPick={(f) => void handleSelect(f)}
            onPickMany={(files) => void handleSelectMany(files)}
            multiple
          />
        </div>
      )}
    </div>
  );
}

export type { Page as ImagePage };
