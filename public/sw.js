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
// Bumped when the shell assets change — the install step re-caches them
// (offline.html carries the "boot into the cached app" redirect).
const CACHE = "scrum-master-v6";
const SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/maskable-512.png",
  "/logo.png",
  "/logowhite.png",
  "/logo-wordmark.png",
  "/logo-wordmark-white.png",
  "/favicon.png",
  "/notification.mp3",
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

  const devHost = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/logo.png" ||
    url.pathname === "/logowhite.png" ||
    url.pathname === "/logo-wordmark.png" ||
    url.pathname === "/logo-wordmark-white.png" ||
    url.pathname === "/favicon.png" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/notification.mp3";

  // Hashed build output and stable static assets: cache-first when cached,
  // with network fallback that populates the cache. On localhost/127.0.0.1
  // (dev and the desktop shell's bundled local server) the live server is
  // authoritative for build chunks, but cached logos/assets must still be
  // available if a fetch fails so the app stays usable offline.
  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        // On the dev server, prefer fresh build chunks so HMR sees changes.
        if (devHost && url.pathname.startsWith("/_next/static/")) {
          try {
            const response = await fetch(request);
            if (response.ok) {
              cache.put(request, response.clone()).catch(() => undefined);
            }
            return response;
          } catch {
            return cached || Response.error();
          }
        }

        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone()).catch(() => undefined);
          }
          return response;
        } catch {
          return cached || Response.error();
        }
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
