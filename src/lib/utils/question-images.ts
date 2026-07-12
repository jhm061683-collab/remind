import type { StoredQuestion } from "@/lib/storage/questions";

export function getQuestionImageUrls(
  question: Pick<StoredQuestion, "imageDataUrl" | "extraImageDataUrls">,
): string[] {
  const extras = question.extraImageDataUrls ?? [];
  return [question.imageDataUrl, ...extras].filter((url) => Boolean(url?.trim()));
}

export async function uploadDataUrlsIfNeeded(
  urls: string[],
  userId: string,
  kind: "question" | "answer",
  uploadFn: (dataUrl: string, userId: string, kind: "question" | "answer") => Promise<string>,
): Promise<string[]> {
  return Promise.all(
    urls.map(async (url) => {
      if (!url.startsWith("data:")) return url;
      return uploadFn(url, userId, kind);
    }),
  );
}
