/**
 * Browser-side Web Push helpers (used by the Settings permission panel).
 * The service worker handles the actual notification display.
 */

export type PushState =
  | "unsupported"
  | "not-configured"
  | "no-permission"
  | "denied"
  | "unsubscribed"
  | "subscribed"
  | "desktop"
  | "failed";

/**
 * The Electron shell exposes this bridge from its preload script. Desktop has
 * no Web Push (PushManager) — the app itself is the notification surface — so
 * in Electron only the OS permission matters.
 */
export function isDesktopApp(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { scrumMasterDesktop?: { electron?: boolean } })
        .scrumMasterDesktop?.electron,
    )
  );
}

function desktopPermissionState(): PushState {
  if (window.Notification.permission === "granted") {
    return "desktop";
  }

  return window.Notification.permission === "denied" ? "denied" : "no-permission";
}

function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Wait for the worker with a deadline — `ready` alone can hang forever. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

  try {
    const ready = navigator.serviceWorker.ready.then((value) => value);

    return (await Promise.race([ready, timeout])) ?? null;
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) {
    return "unsupported";
  }

  if (isDesktopApp()) {
    return desktopPermissionState();
  }

  if (!vapidPublicKey()) {
    return "not-configured";
  }

  if (window.Notification.permission === "denied") {
    return "denied";
  }

  if (window.Notification.permission !== "granted") {
    return "no-permission";
  }

  const active = await registration();

  if (!active) {
    return "failed";
  }

  try {
    const subscription = await active.pushManager.getSubscription();

    return subscription ? "subscribed" : "unsubscribed";
  } catch {
    return "failed";
  }
}

/**
 * Ask for permission (if needed), subscribe this device to push and register
 * the subscription with the server.
 */
export async function subscribePush(): Promise<PushState> {
  if (!supported()) {
    return "unsupported";
  }

  if (isDesktopApp()) {
    // Desktop: only the OS permission is needed — the app shows the alerts
    // itself while it is running.
    const permission = await window.Notification.requestPermission();
    return permission === "granted" ? "desktop" : desktopPermissionState();
  }

  if (!vapidPublicKey()) {
    return "not-configured";
  }

  try {
    const permission =
      window.Notification.permission === "default"
        ? await window.Notification.requestPermission()
        : window.Notification.permission;

    if (permission !== "granted") {
      return permission === "denied" ? "denied" : "no-permission";
    }

    const active = await registration();

    if (!active) {
      return "failed";
    }

    const subscription = await active.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()) as BufferSource,
    });

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      await subscription.unsubscribe().catch(() => undefined);
      return "failed";
    }

    return "subscribed";
  } catch {
    return "failed";
  }
}

/** Unsubscribe this device and forget it on the server. */
export async function unsubscribePush(): Promise<PushState> {
  if (!supported()) {
    return "unsupported";
  }

  if (isDesktopApp()) {
    // Nothing to unsubscribe — the permission itself stays with the OS.
    return desktopPermissionState();
  }

  try {
    const active = await registration();
    const subscription = active ? await active.pushManager.getSubscription() : null;

    if (subscription) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);

      await subscription.unsubscribe().catch(() => undefined);
    }

    return "unsubscribed";
  } catch {
    return "failed";
  }
}
