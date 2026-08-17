"use server";

import { getSession } from "@/lib/auth/session";
import { uploadDataUrlOnServer } from "@/lib/server/upload-image";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";

export async function uploadImageAction(
  dataUrl: string,
  kind: "question" | "answer",
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { error: "저장소가 설정되지 않았습니다." };
  }
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다." };
  }
  if (!dataUrl.startsWith("data:")) {
    return { url: dataUrl };
  }
  // 과도한 페이로드 방지 (~6MB base64 ≈ 실제 4.5MB)
  if (dataUrl.length > 6_500_000) {
    return { error: "사진이 너무 커요. 다시 찍어 주세요." };
  }
  try {
    const url = await uploadDataUrlOnServer(dataUrl, session.id, kind);
    return { url };
  } catch (err) {
    console.error("[uploadImageAction]", err);
    return { error: "사진 업로드에 실패했습니다. 다시 시도해 주세요." };
  }
}
