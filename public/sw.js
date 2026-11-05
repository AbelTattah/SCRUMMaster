/*
 * Scrum Master service worker.
 *
 *  - offline shell: static assets are cached, navigations fall back to the
 *    cached page and finally to /offline.html
 *  - notifications: the "push" event raises an OS notification (unless a
 *    focused tab is already polling the feed itself), and a click focuses or
 *    opens the app at the right screen
 *
 * API responses are never cached — tasks and sessions stay network-only.
 */
const CACHE = "scrum-master-v3";
const SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Hashed build output and static files never change: cache-first.
  // The dev server serves stable chunk URLs that change content in place, so
  // localhost always goes to the network — a cached chunk would freeze HMR.
  const devHost = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

  if (
    !devHost &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/assets/"))
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        const response = await fetch(request);

        if (response.ok) {
          cache.put(request, response.clone()).catch(() => undefined);
        }

        return response;
      }),
    );

    return;
  }

  // Navigations: network first so content is always fresh, cache when the
  // network is gone, and the offline page as the last resort.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) {
            return cached;
          }

          const offline = await caches.match("/offline.html");
          return offline || Response.error();
        }),
    );
  }

  // Everything else (API routes, RSC payloads) is network-only on purpose.
});

self.addEventListener("push", (event) => {
  let payload = { title: "Scrum Master", body: "", url: "/", tag: "" };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (error) {
    payload.body = event.data ? event.data.text() : "";
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // A visible, focused tab polls the feed every 30 seconds and raises the
      // same alert itself — showing it here too would double-notify.
      if (windows.some((client) => client.visibilityState === "visible" && client.focused)) {
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag || payload.url,
        data: { url: payload.url },
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      });

      // The worker cannot play audio — ask any open window to play the
      // bundled alert sound alongside the toast.
      for (const client of windows) {
        client.postMessage({ type: "alert-sound" });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();

          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch (error) {
              // Cross-document navigation can fail while loading; focusing is enough.
            }
          }

          return;
        }
      }

      await self.clients.openWindow(url);
    })(),
  );
});
