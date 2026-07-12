import { createClient } from "@/lib/supabase/client";
import {
  getCustomWrongReasonsLocal,
  saveCustomWrongReasonsLocal,
} from "@/lib/storage/custom-wrong-reasons";
import { isSupabaseEnabled } from "@/lib/supabase/config";

const REASONS_KEY = "__wrong_reasons__";

export async function getCustomWrongReasons(userId: string): Promise<string[]> {
  if (!isSupabaseEnabled()) {
    return getCustomWrongReasonsLocal();
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("subject_id", REASONS_KEY)
    .maybeSingle();

  if (error) {
    console.error("[getCustomWrongReasons]", error);
    return getCustomWrongReasonsLocal();
  }

  const reasons = (data?.settings as { reasons?: string[] } | null)?.reasons;
  if (!Array.isArray(reasons)) return getCustomWrongReasonsLocal();
  const cleaned = reasons.map((r) => String(r).trim()).filter(Boolean);
  saveCustomWrongReasonsLocal(cleaned);
  return cleaned;
}

export async function saveCustomWrongReasons(
  userId: string,
  reasons: string[],
): Promise<boolean> {
  const cleaned = reasons.map((r) => r.trim()).filter(Boolean).slice(0, 40);
  saveCustomWrongReasonsLocal(cleaned);

  if (!isSupabaseEnabled()) return true;

  const supabase = createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: REASONS_KEY,
      settings: { reasons: cleaned },
    },
    { onConflict: "user_id,subject_id" },
  );
  return !error;
}

export async function addCustomWrongReason(
  userId: string,
  reason: string,
): Promise<string[]> {
  const trimmed = reason.trim();
  if (!trimmed) return getCustomWrongReasons(userId);
  const current = await getCustomWrongReasons(userId);
  const next = [trimmed, ...current.filter((r) => r !== trimmed)].slice(0, 40);
  await saveCustomWrongReasons(userId, next);
  return next;
}
