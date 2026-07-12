import { createClient } from "@/lib/supabase/client";

export async function uploadDataUrl(
  dataUrl: string,
  userId: string,
  kind: "question" | "answer",
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${user.id}/${Date.now()}-${kind}.${ext}`;

  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("question-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
