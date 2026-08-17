"use server";

import { getSession } from "@/lib/auth/session";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push/config";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseUserId } from "@/lib/supabase/config";

export type PushSubscribeInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function getPushPublicKeyAction(): Promise<{
  publicKey: string | null;
  configured: boolean;
}> {
  return {
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  };
}

export async function subscribePushAction(
  input: PushSubscribeInput,
): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (!session || session.role !== "student" || !isSupabaseUserId(session.id)) {
    return { error: "학생 로그인이 필요합니다." };
  }
  if (!isPushConfigured()) {
    return { error: "푸시 알림이 아직 설정되지 않았습니다." };
  }
  if (!input.endpoint?.trim() || !input.keys?.p256dh || !input.keys?.auth) {
    return { error: "구독 정보가 올바르지 않습니다." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.id,
      endpoint: input.endpoint.trim(),
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };
  return { success: "알림을 켰어요." };
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return { error: "로그인이 필요합니다." };
  }
  if (!endpoint?.trim()) return { error: "구독 정보가 없습니다." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", session.id)
    .eq("endpoint", endpoint.trim());

  if (error) return { error: error.message };
  return { success: "알림을 껐어요." };
}
