/**
 * Server-side network guard for offline-first rendering.
 *
 * The desktop app runs a bundled server with no internet at times. Any
 * Supabase-backed read used for chrome (counts, notifications, member lists,
 * reports) must degrade to a local fallback instead of throwing a 500.
 */
export async function safeServer<T>(
  work: () => Promise<T>,
  fallback: T,
  timeoutMs = 4000,
): Promise<T> {
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("network timeout")), timeoutMs);
        // Don't keep the process alive just for a guard timer.
        if (typeof timer === "object" && "unref" in timer) {
          (timer as { unref: () => void }).unref();
        }
      }),
    ]);
  } catch {
    return fallback;
  }
}
