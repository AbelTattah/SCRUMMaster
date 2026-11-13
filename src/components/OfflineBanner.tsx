"use client";

import { useEffect, useRef, useState } from "react";

import { checkOnline, isDesktopClient } from "@/lib/connectivity";

/**
 * Makes the offline-first behaviour visible.
 *
 * On the desktop app the shell always runs from a local server and the
 * encrypted task mirror lives on this device, so "offline" is a normal state,
 * not an error. The banner says so plainly and tells the user their work is
 * safe and will sync on its own.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      const result = await checkOnline();
      if (cancelled) return;

      // When connectivity returns, kick a sync so queued changes go out and
      // fresh data comes in without waiting for a manual refresh.
      if (wasOnline.current === false && result === true) {
        void import("@/lib/sync").then((m) => m.syncNow()).catch(() => {});
      }

      wasOnline.current = result;
      setOnline(result);
      setMounted(true);
    };

    update();
    const interval = setInterval(update, 5000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Never flash the banner on the first paint of an online session.
  if (!mounted || online) {
    return null;
  }

  return (
    <div className="offline-banner" role="status">
      <span className="offline-banner-dot" aria-hidden="true" />
      <span>
        <strong>Offline</strong>{" "}
        {isDesktopClient()
          ? "— running on this device. Your tasks are stored here and sync automatically when you reconnect."
          : "— your tasks are stored on this device and sync when you reconnect."}
      </span>
    </div>
  );
}
