"use client";

import { useEffect } from "react";

import { alertHeading, notificationUrl } from "@/lib/notifications";
import { isDesktopApp } from "@/lib/push-client";
import { playAlertSound } from "@/lib/sound";
import type { NotificationKind } from "@/lib/types";

const SEEN_KEY = "Scrum Master.notified";
const PRUNE_MS = 12 * 60 * 60 * 1000;
const POLL_MS = 30_000;

interface FeedItem {
  key: string;
  kind: NotificationKind;
  todo_id: string;
  title: string;
  detail: string;
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function readSeen(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "{}");

    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, number>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage can be unavailable in private mode; alerts still work.
  }
}

/**
 * Polls the actionable notification feed and raises a desktop alert for items
 * this browser has not shown before.
 *
 * Alerts are displayed through the service worker when one is registered —
 * that is the only way installed PWAs (notably Android) can show them, and
 * its click handler opens the right screen. A plain Notification is the
 * fallback. On top of that the unread count is mirrored to the app badge.
 */
export function BrowserNotifications() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    let cancelled = false;
    let timer = 0;

    async function show(item: FeedItem) {
      const body = `${item.title} — ${item.detail}`;
      const url = notificationUrl(item);
      const options: NotificationOptions & { data?: { url: string }; icon?: string; badge?: string } = {
        body,
        tag: item.key,
        data: { url },
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      };

      try {
        // In the desktop shell the page-context Notification is the reliable
        // path (Electron renders it natively); on the web the service worker
        // is required for installed PWAs, notably Android.
        if (!isDesktopApp()) {
          const registration = await navigator.serviceWorker?.getRegistration();

          if (registration) {
            await registration.showNotification(alertHeading(item.kind), options);
            playAlertSound();
            return;
          }
        }
      } catch {
        // Fall through to a page-context notification.
      }

      const alert = new window.Notification(alertHeading(item.kind), options);

      alert.onclick = () => {
        window.focus();
        window.location.assign(url);
      };

      playAlertSound();
    }

    async function updateBadge(unread: number) {
      const badgeNavigator = navigator as BadgeNavigator;

      try {
        if (unread > 0) {
          await badgeNavigator.setAppBadge?.(unread);
        } else {
          await badgeNavigator.clearAppBadge?.();
        }
      } catch {
        // Badge API is progressive enhancement only.
      }
    }

    async function poll() {
      if (cancelled || window.Notification.permission !== "granted") {
        return;
      }

      try {
        const response = await fetch("/api/notifications/feed", { cache: "no-store" });

        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as { items?: FeedItem[]; unread?: number };

        await updateBadge(Number(data.unread ?? 0));

        const seen = readSeen();
        const now = Date.now();

        for (const [key, at] of Object.entries(seen)) {
          if (now - Number(at) > PRUNE_MS) {
            delete seen[key];
          }
        }

        for (const item of data.items ?? []) {
          if (seen[item.key]) {
            continue;
          }

          seen[item.key] = now;

          try {
            await show(item);
          } catch {
            // One failed alert must not stop the rest of the feed.
          }
        }

        writeSeen(seen);
      } catch {
        // A network hiccup should never interrupt the page.
      }
    }

    void poll();
    timer = window.setInterval(poll, POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
