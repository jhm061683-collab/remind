/** data URL / Storage URL → Gemini/OpenAI multimodal 파트로 쓸 MIME + base64 */

export type ImageDataParts = {
  mimeType: string;
  base64: string;
};

function mimeFromContentType(contentType: string | null): string {
  const raw = (contentType ?? "").split(";")[0]?.trim().toLowerCase();
  if (raw?.startsWith("image/")) return raw;
  return "image/jpeg";
}

function mimeFromPath(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/** data URL 또는 공개/서명된 https 이미지 URL을 모델 입력으로 변환 */
export async function resolveImageParts(source: string): Promise<ImageDataParts> {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("인식할 이미지가 없습니다.");
  }

  const dataMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (dataMatch) {
    return {
      mimeType: dataMatch[1].toLowerCase() || "image/jpeg",
      base64: dataMatch[2].replace(/\s/g, ""),
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const res = await fetch(trimmed);
    if (!res.ok) {
      throw new Error("저장된 문제 사진을 불러오지 못했습니다.");
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      mimeType: mimeFromContentType(res.headers.get("content-type")) || mimeFromPath(trimmed),
      base64: buffer.toString("base64"),
    };
  }

  // raw base64 로 넘어온 경우
  const base64 = trimmed.replace(/^base64,/i, "").replace(/\s/g, "");
  if (base64.length < 32) {
    throw new Error("인식할 이미지가 없습니다.");
  }
  return { mimeType: "image/jpeg", base64 };
}

/** @deprecated resolveImageParts 사용 */
export function parseImageDataUrl(dataUrl: string): ImageDataParts {
  const trimmed = dataUrl.trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (match) {
    return {
      mimeType: match[1].toLowerCase() || "image/jpeg",
      base64: match[2].replace(/\s/g, ""),
    };
  }
  const base64 = trimmed.replace(/^base64,/i, "").replace(/\s/g, "");
  if (base64.length < 32) {
    throw new Error("인식할 이미지가 없습니다.");
  }
  return { mimeType: "image/jpeg", base64 };
}
