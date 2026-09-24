// Service worker: Web Push notifications, plus an offline page for page loads.
// Pages and data are never cached — everything in the app is per-user.

const CACHE = "offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// Full page loads only: straight to the network, the offline page if that fails.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const jobs = [
    self.registration.showNotification(data.title || "ระบบแจ้งซ่อม", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      lang: "th",
      // Updates about the same request replace each other instead of piling up.
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/notifications" },
    }),
  ];
  // Unread count on the home-screen icon (installed app, where supported).
  if (typeof data.unread === "number" && "setAppBadge" in self.navigator) {
    jobs.push(self.navigator.setAppBadge(data.unread).catch(() => {}));
  }
  event.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  if (url.origin !== self.location.origin) return; // only ever open our own pages

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === url.origin);
      if (open) {
        await open.focus();
        return open.navigate(url.href).catch(() => self.clients.openWindow(url.href));
      }
      return self.clients.openWindow(url.href);
    })(),
  );
});
