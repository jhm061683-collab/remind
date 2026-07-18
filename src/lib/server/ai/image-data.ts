/** data URL → Gemini/OpenAI multimodal 파트로 쓸 MIME + base64 */

export type ImageDataParts = {
  mimeType: string;
  base64: string;
};

export function parseImageDataUrl(dataUrl: string): ImageDataParts {
  const trimmed = dataUrl.trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (match) {
    return {
      mimeType: match[1].toLowerCase() || "image/jpeg",
      base64: match[2].replace(/\s/g, ""),
    };
  }
  // raw base64 로 넘어온 경우
  const base64 = trimmed.replace(/^base64,/i, "").replace(/\s/g, "");
  if (base64.length < 32) {
    throw new Error("인식할 이미지가 없습니다.");
  }
  return { mimeType: "image/jpeg", base64 };
}
