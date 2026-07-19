import type { ExtractedFigureRegion } from "@/lib/server/ai/extract-types";

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https:\/\//i.test(source)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("FIGURE_IMAGE_LOAD_FAILED"));
    image.src = source;
  });
}

/** AI가 찾은 0~1000 좌표 영역을 원본 사진에서 잘라낸다. */
export async function cropExtractedFigures(
  imageSources: string[],
  figures: ExtractedFigureRegion[],
): Promise<string[]> {
  const result: string[] = [];

  for (const figure of figures) {
    const source = imageSources[figure.pageIndex];
    if (!source) continue;

    try {
      const image = await loadImage(source);
      const paddingX = Math.round(image.naturalWidth * 0.008);
      const paddingY = Math.round(image.naturalHeight * 0.008);
      const rawX = Math.round((figure.x / 1000) * image.naturalWidth);
      const rawY = Math.round((figure.y / 1000) * image.naturalHeight);
      const rawWidth = Math.round((figure.width / 1000) * image.naturalWidth);
      const rawHeight = Math.round((figure.height / 1000) * image.naturalHeight);
      const sx = Math.max(0, rawX - paddingX);
      const sy = Math.max(0, rawY - paddingY);
      const sourceWidth = Math.min(
        image.naturalWidth - sx,
        rawWidth + paddingX * 2,
      );
      const sourceHeight = Math.min(
        image.naturalHeight - sy,
        rawHeight + paddingY * 2,
      );
      if (sourceWidth < 20 || sourceHeight < 20) continue;

      const maxWidth = 1400;
      const scale = Math.min(1, maxWidth / sourceWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        sx,
        sy,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      result.push(canvas.toDataURL("image/jpeg", 0.92));
    } catch {
      // 영역 하나를 자르지 못해도 문제 텍스트 저장은 계속한다.
    }
  }

  return result;
}

/**
 * AI가 본문에 배치한 [[FIGURE_1]] 표식을 실제 이미지 표식으로 바꾼다.
 * 표식이 빠졌다면 시각 자료를 본문 끝에 추가한다.
 */
export function embedProblemFigures(
  content: string,
  figureUrls: string[],
): string {
  let next = content;
  const unused: string[] = [];

  figureUrls.forEach((url, index) => {
    const number = index + 1;
    const marker = `[[FIGURE:${url}]]`;
    const patterns = [
      new RegExp(`\\[\\[FIGURE_${number}\\]\\]`, "gi"),
      new RegExp(`\\[그림\\s*${number}\\]`, "g"),
    ];
    let replaced = false;
    for (const pattern of patterns) {
      if (pattern.test(next)) {
        next = next.replace(pattern, marker);
        replaced = true;
      }
    }
    if (!replaced) unused.push(marker);
  });

  // 좌표 오류·이미지 로드 실패 시 표식을 지우면 사용자는 그림이 빠진 사실을
  // 알 수 없다. 렌더러가 명확한 원본 확인 안내를 보여주도록 보존한다.
  next = next.replace(/\[\[FIGURE_\d+\]\]/gi, "[[FIGURE_MISSING]]").trim();
  return unused.length > 0
    ? `${next}\n\n${unused.join("\n\n")}`
    : next;
}
