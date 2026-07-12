/** 모바일 사진을 localStorage에 저장하기 좋게 압축합니다. */
export async function compressImage(file: File, maxWidth = 800): Promise<File> {
  if (!isLikelyImage(file)) return file;

  try {
    const { width, height, draw } = await loadImageSource(file);
    const scale = Math.min(1, maxWidth / width);
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    draw(ctx, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.72);
    });

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (/\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name)) return true;
  // iOS 카메라는 type이 비어 있는 경우가 많음
  return file.size > 0 && !file.type;
}

async function loadImageSource(file: File): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}> {
  try {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    return {
      width,
      height,
      draw: (ctx, w, h) => {
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
      },
    };
  } catch {
    return loadViaImageElement(file);
  }
}

function loadViaImageElement(file: File): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        draw: (ctx, w, h) => {
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
        },
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

export async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("invalid blob"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function stitchDataUrlsVertically(
  dataUrls: string[],
  maxWidth = 800,
): Promise<string> {
  if (dataUrls.length === 0) throw new Error("NO_IMAGES");
  if (dataUrls.length === 1) return dataUrls[0]!;

  const images = await Promise.all(dataUrls.map(loadDataUrlImage));
  const targetW = Math.min(
    maxWidth,
    Math.max(...images.map((img) => img.width)),
  );

  const scaled = images.map((img) => {
    const scale = targetW / img.width;
    return {
      width: targetW,
      height: Math.round(img.height * scale),
      draw: (ctx: CanvasRenderingContext2D, y: number) => {
        ctx.drawImage(img.el, 0, y, targetW, Math.round(img.height * scale));
      },
    };
  });

  const totalH = scaled.reduce((sum, s) => sum + s.height, 0);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = totalH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_FAILED");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, totalH);

  let y = 0;
  for (const part of scaled) {
    part.draw(ctx, y);
    y += part.height;
  }

  for (const img of images) {
    if (img.el instanceof HTMLImageElement && img.el.src.startsWith("blob:")) {
      URL.revokeObjectURL(img.el.src);
    }
  }

  return canvas.toDataURL("image/jpeg", 0.82);
}

function loadDataUrlImage(
  dataUrl: string,
): Promise<{ el: HTMLImageElement | ImageBitmap; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ el: img, width: img.width, height: img.height });
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

export async function fileOrPreviewToDataUrl(
  file: File | null,
  previewUrl: string | null,
): Promise<string> {
  if (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("invalid file"));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  if (previewUrl?.startsWith("blob:")) {
    return blobUrlToDataUrl(previewUrl);
  }

  if (previewUrl?.startsWith("data:")) {
    return previewUrl;
  }

  throw new Error("NO_IMAGE");
}
