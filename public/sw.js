/* Re:mind PWA — 설치 + 웹 푸시 (v4) */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // 네트워크 우선 — 설치 조건 충족용 (오프라인 캐시 해킹 없음)
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Re:mind",
    body: "새 알림이 도착했어요.",
    url: "/notifications",
    tag: "remind-admin-notice",
    icon: "/pwa-icon/192",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    /* 기본값 사용 */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/pwa-icon/192",
      badge: "/icon",
      tag: data.tag || "remind-admin-notice",
      data: { url: data.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/notifications";
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client && client.url.startsWith(self.location.origin)) {
            return client.focus();
          }
        }
        return clients.openWindow(absolute);
      }),
  );
});
