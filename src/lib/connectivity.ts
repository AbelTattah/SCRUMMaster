/**
 * Client-side connectivity check.
 *
 * On the web, navigator.onLine is reliable. On the desktop app the browser
 * talks to a local server (127.0.0.1), so navigator.onLine is always true
 * even with no internet. For desktop we probe the Supabase endpoint instead.
 */
const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "";

export function isDesktopClient(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "127.0.0.1" || host === "localhost";
}

export async function checkOnline(): Promise<boolean> {
  if (typeof navigator === "undefined") return true;

  // Web: trust navigator.onLine.
  if (!isDesktopClient()) {
    return navigator.onLine;
  }

  // Desktop: navigator.onLine is always true (localhost), so probe Supabase.
  if (!navigator.onLine) return false;
  if (!SUPABASE_URL) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
