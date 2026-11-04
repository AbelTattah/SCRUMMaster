import { createAdminClient } from "@/lib/supabase/admin";
import type { StoredSubscription } from "@/lib/push";

interface RawSubscription {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}

/** Validate and normalise a `PushSubscription.toJSON()` body. */
export function parseSubscription(
  body: unknown,
): (StoredSubscription & { userAgent: string | null }) | null {
  const candidate = body as RawSubscription & { userAgent?: string };

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const endpoint = typeof candidate.endpoint === "string" ? candidate.endpoint : "";
  const p256dh = typeof candidate.keys?.p256dh === "string" ? candidate.keys.p256dh : "";
  const auth = typeof candidate.keys?.auth === "string" ? candidate.keys.auth : "";

  if (!endpoint.startsWith("https://") || p256dh.length < 40 || auth.length < 10) {
    return null;
  }

  const userAgent =
    typeof candidate.userAgent === "string" ? candidate.userAgent.slice(0, 300) : null;

  return { endpoint, p256dh, auth, userAgent };
}

export async function upsertSubscription(
  userId: string,
  subscription: StoredSubscription,
  userAgent: string | null,
): Promise<string | null> {
  const { error } = await createAdminClient().from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  return error?.message ?? null;
}

export async function removeSubscription(
  userId: string,
  endpoint: string,
): Promise<string | null> {
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  return error?.message ?? null;
}

export async function subscriptionCount(userId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return count ?? 0;
}
