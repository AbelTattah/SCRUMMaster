"use client";

import { useEffect, useState } from "react";

type Permission = NotificationPermission | "unsupported";

export function PermissionPanel() {
  const [permission, setPermission] = useState<Permission>("default");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(window.Notification.permission);
    }

    setChecked(true);
  }, []);

  async function request() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await window.Notification.requestPermission();
    setPermission(result);
  }

  const message = !checked
    ? "Checking permission…"
    : permission === "granted"
      ? "Browser notifications are allowed. Alerts appear while Scrum Master is open."
      : permission === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser's site settings."
        : permission === "unsupported"
          ? "This browser does not support desktop notifications."
          : "Notifications have not been allowed yet.";

  return (
    <>
      <p className="setting-status">{message}</p>

      <button
        className="btn-ghost btn-small"
        type="button"
        onClick={request}
        disabled={!checked || permission === "granted" || permission === "unsupported"}
      >
        {permission === "granted" ? "Notifications allowed" : "Allow browser notifications"}
      </button>
    </>
  );
}
