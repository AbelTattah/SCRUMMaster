"use client";

import { useEffect, useState } from "react";

import {
  getPushState,
  subscribePush,
  unsubscribePush,
  type PushState,
} from "@/lib/push-client";
import { playAlertSound } from "@/lib/sound";

const LABELS: Record<PushState, string> = {
  unsupported: "This browser does not support desktop notifications.",
  "not-configured": "Push alerts are not configured on this deployment yet.",
  "no-permission": "Notifications have not been allowed yet.",
  denied:
    "Notifications are blocked for this site. Allow them in your browser's site settings to get alerts.",
  unsubscribed: "Notifications are allowed. This device is not registered for push yet.",
  subscribed: "This device receives alerts even when Scrum Master is closed.",
  desktop: "Desktop alerts are on — they appear while Scrum Master is open.",
  failed: "The browser blocked the request — allow notifications in your site settings.",
};

// Labels stay static (no environment branching) so server and client render
// the same text; the state message below carries the specifics.
const BUTTONS: Partial<Record<PushState, string>> = {
  "no-permission": "Allow notifications",
  unsubscribed: "Turn on push for this device",
  subscribed: "Turn off push for this device",
  failed: "Try again",
};

/**
 * Permission + Web Push state for one browser. The actual permission prompt
 * and the push subscription both happen on the user's click, which is what
 * browsers require — plus a one-click test alert so people can see the result
 * immediately (web and desktop alike).
 */
export function PermissionPanel() {
  const [state, setState] = useState<PushState>("no-permission");
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [testNote, setTestNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getPushState().then((value) => {
      if (!cancelled) {
        setState(value);
        setChecked(true);
        setGranted(
          typeof window !== "undefined" &&
            "Notification" in window &&
            window.Notification.permission === "granted",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const next = state === "subscribed" ? await unsubscribePush() : await subscribePush();
      setState(next);
      setGranted(
        typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted",
      );
    } finally {
      setBusy(false);
    }
  }

  function sendTest() {
    try {
      new Notification("Scrum Master", {
        body: "This is what an alert looks like.",
      });
      playAlertSound();
      setTestNote("Test alert sent — you should see it now.");
    } catch {
      setTestNote("The browser blocked the test alert.");
    }
  }

  const message = !checked ? "Checking permission…" : LABELS[state];
  const label = BUTTONS[state];

  return (
    <>
      <p className="setting-status">{message}</p>

      <div className="permission-actions">
        {label ? (
          <button className="btn-ghost btn-small" type="button" onClick={toggle} disabled={!checked || busy}>
            {busy ? "Working…" : label}
          </button>
        ) : null}

        {granted ? (
          <button className="btn-ghost btn-small" type="button" onClick={sendTest}>
            Send a test alert
          </button>
        ) : null}
      </div>

      {testNote ? (
        <p className="setting-status" role="status">
          {testNote}
        </p>
      ) : null}
    </>
  );
}
