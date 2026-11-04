"use client";

import { useEffect, useState } from "react";

import {
  getPushState,
  subscribePush,
  unsubscribePush,
  type PushState,
} from "@/lib/push-client";

const LABELS: Record<PushState, string> = {
  unsupported: "This browser does not support desktop notifications.",
  "not-configured": "Push alerts are not configured on this deployment yet.",
  "no-permission": "Notifications have not been allowed yet.",
  denied:
    "Notifications are blocked for this site. Allow them in your browser's site settings to get alerts.",
  unsubscribed: "Notifications are allowed. This device is not registered for push yet.",
  subscribed: "This device receives alerts even when Scrum Master is closed.",
  failed: "The browser blocked the request — allow notifications in your site settings.",
};

const BUTTONS: Partial<Record<PushState, string>> = {
  "no-permission": "Allow browser notifications",
  unsubscribed: "Turn on push for this device",
  subscribed: "Turn off push for this device",
  failed: "Try again",
};

/**
 * Permission + Web Push state for one browser. The actual permission prompt
 * and the push subscription both happen on the user's click, which is what
 * browsers require.
 */
export function PermissionPanel() {
  const [state, setState] = useState<PushState>("no-permission");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getPushState().then((value) => {
      if (!cancelled) {
        setState(value);
        setChecked(true);
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
    } finally {
      setBusy(false);
    }
  }

  const message = !checked ? "Checking permission…" : LABELS[state];
  const label = BUTTONS[state];
  const disabled = !checked || busy || !label;

  return (
    <>
      <p className="setting-status">{message}</p>

      <button className="btn-ghost btn-small" type="button" onClick={toggle} disabled={disabled}>
        {busy ? "Working…" : (label ?? "Allow browser notifications")}
      </button>
    </>
  );
}
