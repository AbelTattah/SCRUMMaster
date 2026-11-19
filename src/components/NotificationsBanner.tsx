"use client";

/**
 * Slim workspace banner (new UI design) nudging people to enable real-time
 * alerts. It is honest: "Get notifications" asks the browser for permission
 * and then opens Settings where push can be finished; "Snooze" hides it for a
 * day and the close button hides it for the session. No dead ends.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";

const DISMISS_KEY = "scrum-master.notif-banner-dismissed";
const SNOOZE_KEY = "scrum-master.notif-banner-snoozed";
const DAY_MS = 24 * 60 * 60 * 1000;

export function NotificationsBanner() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
      const snoozedAt = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
      const snoozed = Boolean(snoozedAt) && Date.now() - snoozedAt < DAY_MS;
      setVisible(!dismissed && !snoozed);
    } catch {
      setVisible(true);
    }
  }, []);

  function close() {
    setVisible(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  function snooze() {
    setVisible(false);
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function enable() {
    try {
      if ("Notification" in window && window.Notification.permission === "default") {
        await window.Notification.requestPermission();
      }
    } catch {
      // The settings page still offers the full controls.
    }
    setDone(true);
    window.setTimeout(() => setVisible(false), 1200);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="notice-banner" role="status">
      <span className="notice-banner-icon">
        <Icon name="bell" />
      </span>

      <p className="notice-banner-text">
        {done ? (
          "Notifications enabled — finish setup in Settings."
        ) : (
          <>Don&rsquo;t let important updates slip by. Enable real-time notifications.</>
        )}
      </p>

      <div className="notice-banner-actions">
        <button type="button" className="notice-btn" onClick={() => void enable()}>
          {done ? "Finish in Settings" : "Get notifications"}
        </button>
        <button type="button" className="notice-btn notice-btn--ghost" onClick={snooze}>
          Snooze
        </button>
      </div>

      <button type="button" className="notice-close" onClick={close} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
