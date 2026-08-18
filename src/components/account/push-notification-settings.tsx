"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPushPublicKeyAction,
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPhoneDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipod|mobile/i.test(navigator.userAgent);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

type Status =
  | "loading"
  | "unsupported"
  | "desktop"
  | "off"
  | "on"
  | "blocked"
  | "need-install";

/** 계정 설정 — 휴대폰에서만 학원 푸시 알림 on/off */
export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refreshStatus(clearMessage = false) {
    if (clearMessage) setMessage(null);
    if (typeof window === "undefined") return;

    if (!isPhoneDevice()) {
      setStatus("desktop");
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    if (isIos() && !isStandalone()) {
      setStatus("need-install");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("unsupported");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await refreshStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMessage(null);
      const { publicKey, configured } = await getPushPublicKeyAction();
      if (!configured || !publicKey) {
        setMessage("지금은 휴대폰 알림을 켤 수 없어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        setMessage("알림 권한이 필요해요. 휴대폰 설정에서 허용해 주세요.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setMessage("구독에 실패했어요. 다시 시도해 주세요.");
        return;
      }

      const res = await subscribePushAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }

      setStatus("on");
      setMessage(res.success ?? "알림을 켰어요.");
    });

  const disable = () =>
    startTransition(async () => {
      setMessage(null);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await unsubscribePushAction(endpoint);
        }
        setStatus("off");
        setMessage("알림을 껐어요.");
      } catch {
        setMessage("알림을 끄지 못했어요. 다시 시도해 주세요.");
      }
    });

  // PC에서는 설정 UI 대신 안내만
  if (status === "loading") return null;

  if (status === "desktop") {
    return (
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-[var(--rm-text)]">
          휴대폰 알림
        </h2>
        <p className="text-xs leading-relaxed text-[var(--rm-muted)]">
          푸시 알림은 휴대폰에서만 켤 수 있어요. PC에서는 앱 안의 알림함으로
          확인하세요.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-[var(--rm-text)]">
        휴대폰 알림
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-[var(--rm-muted)]">
        원장님이 보낸 공지를 이 휴대폰으로 받아요. 이 기기에서만 설정됩니다.
      </p>

      {status === "unsupported" ? (
        <p className="text-sm text-[var(--rm-text-muted)]">
          이 브라우저는 푸시 알림을 지원하지 않아요.
        </p>
      ) : null}

      {status === "need-install" ? (
        <p className="text-sm leading-relaxed text-[var(--rm-text-muted)]">
          iPhone에서는 홈 화면에 Re:mind를 추가한 뒤, 여기서 알림을 켤 수
          있어요.
        </p>
      ) : null}

      {status === "blocked" ? (
        <p className="text-sm leading-relaxed text-[var(--rm-text-muted)]">
          알림이 차단되어 있어요. 휴대폰 설정 → 알림에서 Re:mind(또는
          브라우저) 알림을 허용한 뒤 다시 시도해 주세요.
        </p>
      ) : null}

      {status === "off" || status === "on" ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--rm-text)]">
              {status === "on" ? "알림 켜짐" : "알림 꺼짐"}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--rm-text-muted)]">
              {status === "on"
                ? "학원 공지가 오면 휴대폰에 표시돼요"
                : "공지는 앱 안의 알림함에서만 볼 수 있어요"}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => (status === "on" ? disable() : enable())}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold disabled:opacity-50 ${
              status === "on"
                ? "border border-[var(--rm-border)] text-[var(--rm-text-muted)]"
                : "rm-fill-brand"
            }`}
          >
            {pending ? "처리 중…" : status === "on" ? "끄기" : "켜기"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 text-[11px] text-[var(--rm-text-muted)]">{message}</p>
      ) : null}
    </section>
  );
}
