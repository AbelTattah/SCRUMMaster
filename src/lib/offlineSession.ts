import type { CurrentUser } from "@/lib/types";

/**
 * A locally cached session for the desktop app's offline boots.
 *
 * The desktop shell always serves the app from a fixed local origin. Server
 * components (layout, pages) need a user to render the shell, but Supabase
 * auth is unreachable with no network. So the client persists the signed-in
 * profile into a cookie and the server reads it back — no network needed.
 *
 * Pure JS (TextEncoder/atob/btoa) so this module is safe in both the server
 * and client bundles.
 */
export const OFFLINE_SESSION_COOKIE = "scrum-offline-session";
export const OFFLINE_HINT_COOKIE = "scrum-offline-hint";

function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSession(user: CurrentUser): string {
  return encode(JSON.stringify(user));
}

export function decodeSession(raw: string | undefined): CurrentUser | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(raw)) as CurrentUser;
    if (!parsed?.id || !parsed?.profile?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Client: persist the session so the next offline boot renders instantly. */
export function writeOfflineSession(user: CurrentUser): void {
  try {
    document.cookie = `${OFFLINE_SESSION_COOKIE}=${encodeSession(user)}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  } catch {
    // cookie blocked — online boots still work through Supabase
  }
}

/** Client: drop the local session on sign-out / leaving guest mode. */
export function clearOfflineSession(): void {
  try {
    document.cookie = `${OFFLINE_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch {
    // ignore
  }
}

/** Client: tell the server whether the browser has connectivity right now. */
export function setOfflineHint(offline: boolean): void {
  try {
    document.cookie = `${OFFLINE_HINT_COOKIE}=${offline ? "1" : "0"}; path=/; max-age=86400; SameSite=Lax`;
  } catch {
    // ignore
  }
}
