"use client";

import { useEffect } from "react";

const SEEN_KEY = "Scrum Master.notified";
const PRUNE_MS = 12 * 60 * 60 * 1000;

interface FeedItem {
  key: string;
  kind: string;
  todo_id: string;
  title: string;
  detail: string;
}

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
 * this browser has not shown before. "Coming up" tasks are deliberately
 * excluded by the feed; they stay on the notifications screen.
 */
export function BrowserNotifications() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    let cancelled = false;
    let timer = 0;

    async function poll() {
      if (cancelled || window.Notification.permission !== "granted") {
        return;
      }

      try {
        const response = await fetch("/api/notifications/feed", { cache: "no-store" });

        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as { items?: FeedItem[] };
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

          const alert = new window.Notification(
            item.kind === "overdue" ? "Overdue task" : "Starting soon",
            {
              body: `${item.title} — ${item.detail}`,
              tag: item.key,
            },
          );

          alert.onclick = () => {
            window.focus();
            window.location.assign(`/?edit=${encodeURIComponent(item.todo_id)}`);
          };

          seen[item.key] = now;
        }

        writeSeen(seen);
      } catch {
        // A network hiccup should never interrupt the page.
      }
    }

    void poll();
    timer = window.setInterval(poll, 30_000);

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
