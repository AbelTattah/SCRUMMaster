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

  // Web: trust navigator.onLine as a quick signal, but don't trust a false
  // positive in restricted environments — fall through to no hard probe here.
  if (!isDesktopClient()) {
    return navigator.onLine;
  }

  // Desktop: navigator.onLine reflects the local/adapter state but localhost
  // can mask internet loss; probe the actual backend for a reliable answer.
  if (!SUPABASE_URL) {
    return navigator.onLine;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    // Any HTTP response means the backend is reachable (even 401/4xx) => online.
    return res.status > 0;
  } catch {
    return false;
  }
}
