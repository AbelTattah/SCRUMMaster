import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The public key is NEXT_PUBLIC_ (the browser needs it) but the server reads
 * the same variable when signing pushes — one key pair, two consumers. */
function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

/** Web Push is optional: without VAPID keys every send is a no-op. */
export function pushConfigured(): boolean {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

function vapidDetails(): { subject: string; publicKey: string; privateKey: string } {
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@scrum-master.app";

  return {
    subject,
    publicKey: vapidPublicKey(),
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  };
}

export type PushResult = "sent" | "gone" | "failed";

/**
 * Deliver one push message. A 404/410 from the push service means the
 * subscription is dead and should be deleted by the caller.
 */
export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<PushResult> {
  if (!pushConfigured()) {
    return "failed";
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      {
        vapidDetails: vapidDetails(),
        TTL: 600, // ten minutes: a stale alert is worthless
        urgency: "normal",
      },
    );

    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;

    if (status === 404 || status === 410) {
      return "gone";
    }

    console.error("[push] send failed", status ?? error);
    return "failed";
  }
}

/**
 * Push a user's pending alerts to every device they subscribed with.
 *
 * Returns how many devices were reached ("sent"), whether subscriptions
 * existed but all sends failed ("failed"), or that no device is subscribed
 * at all ("none") — the caller uses that to decide whether the alert was
 * actually delivered somewhere.
 */
export async function pushPendingAlerts(
  profile: Pick<Profile, "id" | "name">,
  payload: PushPayload,
): Promise<"sent" | "failed" | "none"> {
  const { data } = await createAdminClient()
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", profile.id);

  const subscriptions = (data ?? []) as StoredSubscription[];

  if (subscriptions.length === 0) {
    return "none";
  }

  let reached = 0;

  for (const subscription of subscriptions) {
    const result = await sendPush(subscription, payload);

    if (result === "sent") {
      reached += 1;
    }

    if (result === "gone") {
      await createAdminClient()
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
  }

  return reached > 0 ? "sent" : "failed";
}
