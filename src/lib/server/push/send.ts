import webpush from "web-push";
import {
  isPushConfigured,
  type PushPayload,
} from "@/lib/push/config";
import { getSiteUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function ensureVapid() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

function toWebPushSubscription(row: PushSubscriptionRow) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

/** 대상 학생들의 등록된 기기로 푸시 발송 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!ensureVapid() || userIds.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error || !rows?.length) {
    if (error) console.error("[push]", error.message);
    return { sent: 0, removed: 0 };
  }

  const site = getSiteUrl();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
    tag: payload.tag ?? "remind-admin-notice",
    icon: `${site}/pwa-icon/192`,
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(row as PushSubscriptionRow),
          body,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
          removed += 1;
        } else {
          console.error("[push] send failed", row.endpoint.slice(0, 48), err);
        }
      }
    }),
  );

  return { sent, removed };
}
