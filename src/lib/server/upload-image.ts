import { createClient } from "@/lib/supabase/server";

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("INVALID_IMAGE_DATA");
  }
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function uploadDataUrlOnServer(
  dataUrl: string,
  userId: string,
  kind: "question" | "answer",
): Promise<string> {
  const supabase = await createClient();
  const { contentType, buffer } = parseDataUrl(dataUrl);
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/${Date.now()}-${kind}.${ext}`;

  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, buffer, {
      contentType: contentType || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("question-images").getPublicUrl(path);
  return data.publicUrl;
}
