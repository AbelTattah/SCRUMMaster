import { notificationRecipients, findProfileByEmail } from "@/lib/data/profiles";
import { markNotificationsEmailed, notificationsForUser } from "@/lib/data/notifications";
import { countTodosCreatedSince } from "@/lib/data/todos";
import { subscriptionCount } from "@/lib/data/push";
import {
  alertHeading,
  notificationDigest,
  notificationUrl,
  todoNudge,
  todoNudgeEmail,
} from "@/lib/notifications";
import { pushConfigured, pushPendingAlerts, type PushPayload } from "@/lib/push";
import { mailTransport, sendMail } from "@/lib/mail";
import { startOfToday } from "@/lib/time";
import type { NotificationItem, Profile } from "@/lib/types";

export interface DigestOptions {
  /** Only consider this account (profile id or email). */
  user?: string;
  /** Show what would be sent without sending or marking anything. */
  dryRun?: boolean;
}

export interface DigestResult {
  sent: number;
  skipped: number;
  failed: number;
  transport: string;
  lines: string[];
}

/** Kinds worth an email or a push — "coming up" stays in-app only. */
const ALERT_KINDS = new Set<NotificationItem["kind"]>([
  "overdue",
  "blocker",
  "reminder",
]);

/**
 * Send the notification digest.
 *
 * Every actionable item goes out over each channel the user has: the email
 * digest (when enabled) and a Web Push message to every subscribed device
 * (which is what reaches people with the app closed). An item is marked as
 * alerted once it reached someone — failed channels are retried on the next
 * run instead of being swallowed.
 */
export async function runDigest(options: DigestOptions = {}): Promise<DigestResult> {
  const transport = mailTransport();

  let recipients = await notificationRecipients();

  if (options.user) {
    if (options.user.includes("@")) {
      const profile = await findProfileByEmail(options.user);

      recipients = profile ? [profile] : [];
    } else {
      recipients = recipients.filter((profile) => profile.id === options.user);
    }
  }

  if (recipients.length === 0) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      transport,
      lines: ["No accounts to notify."],
    };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const lines: string[] = [];

  for (const user of recipients) {
    const label = `${user.name} <${user.email}>`;

    const items = await notificationsForUser(user);
    const pending = items.filter((item) => !item.emailed && ALERT_KINDS.has(item.kind));

    if (pending.length === 0) {
      // Nothing actionable — but if the day is still empty, the digest itself
      // becomes the reminder to plan it (periodic nudge, see todoNudge).
      const nudge = todoNudge();

      if (nudge && (await countTodosCreatedSince(user.id, startOfToday())) === 0) {
        const digest = todoNudgeEmail(user);
        const payload: PushPayload = {
          title: "Plan your day",
          body: `${nudge.title} — ${nudge.detail}`,
          url: "/?add=1",
          tag: nudge.key,
        };

        if (options.dryRun) {
          let mentioned = false;

          if (user.notify_email) {
            lines.push(`  would nudge  ${label} — ${digest.subject}`);
            mentioned = true;
          }

          if (pushConfigured() && user.notify_browser) {
            const devices = await subscriptionCount(user.id);

            if (devices > 0) {
              lines.push(`  would push   ${label} — ${devices} device(s): ${payload.title}`);
              mentioned = true;
            }
          }

          if (mentioned) {
            sent += 1;
          } else {
            lines.push(`  skip  ${label} — no delivery channel for the nudge`);
            skipped += 1;
          }

          continue;
        }

        const failures: string[] = [];
        let delivered = false;

        if (user.notify_email) {
          const result = await sendMail({
            to: user.email,
            subject: digest.subject,
            text: digest.text,
            html: digest.html,
            userId: user.id,
          });

          if (result.ok) {
            lines.push(`  nudge  ${label} — ${digest.subject}`);
            delivered = true;
          } else {
            failures.push(`email: ${result.error ?? "unknown mail error"}`);
          }
        }

        if (pushConfigured() && user.notify_browser) {
          const outcome = await pushPendingAlerts(user, payload);

          if (outcome === "sent") {
            lines.push(`  push   ${label} — ${payload.title}`);
            delivered = true;
          } else if (outcome === "failed") {
            failures.push("push: send failed");
          }
          // "none" — no subscribed devices; not a failure.
        }

        if (delivered) {
          sent += 1;
          continue;
        }

        if (failures.length > 0) {
          lines.push(`  FAIL  ${label} — ${failures.join("; ")}`);
          failed += 1;
          continue;
        }

        lines.push(`  skip  ${label} — no delivery channel for the nudge`);
        skipped += 1;
        continue;
      }

      lines.push(`  skip  ${label} — nothing new needs attention`);
      skipped += 1;
      continue;
    }

    const digest = notificationDigest(items, user);
    const payload = buildPushPayload(pending);

    if (options.dryRun) {
      let mentioned = false;

      if (user.notify_email) {
        lines.push(`  would send  ${label} — ${digest.subject}`);

        for (const item of pending) {
          lines.push(`      • ${item.title} — ${item.detail}`);
        }

        mentioned = true;
      }

      if (pushConfigured() && user.notify_browser) {
        const devices = await subscriptionCount(user.id);

        if (devices > 0) {
          lines.push(`  would push  ${label} — ${devices} device(s): ${payload.title}`);
          mentioned = true;
        }
      }

      if (mentioned) {
        sent += 1;
      } else {
        lines.push(`  skip  ${label} — no delivery channel (email off, no push devices)`);
        skipped += 1;
      }

      continue;
    }

    const failures: string[] = [];
    let delivered = false;

    if (user.notify_email) {
      const result = await sendMail({
        to: user.email,
        subject: digest.subject,
        text: digest.text,
        html: digest.html,
        userId: user.id,
      });

      if (result.ok) {
        lines.push(`  sent  ${label} — ${digest.subject}`);
        delivered = true;
      } else {
        failures.push(`email: ${result.error ?? "unknown mail error"}`);
      }
    }

    if (pushConfigured() && user.notify_browser) {
      const outcome = await pushPendingAlerts(user, payload);

      if (outcome === "sent") {
        lines.push(`  push   ${label} — ${payload.title}`);
        delivered = true;
      } else if (outcome === "failed") {
        failures.push("push: send failed");
      }
      // "none" — this user has no subscribed devices; not a failure.
    }

    if (delivered) {
      await markNotificationsEmailed(
        user.id,
        pending.map((item) => item.key),
      );

      if (failures.length > 0) {
        lines.push(`  note  ${label} — delivered, but ${failures.join("; ")}`);
      }

      sent += 1;
      continue;
    }

    if (failures.length > 0) {
      // Leave the items pending so the next run retries them.
      lines.push(`  FAIL  ${label} — ${failures.join("; ")}`);
      failed += 1;
      continue;
    }

    // Nothing is configured to deliver on: mark anyway so the counters stay
    // honest — the in-app feed remains the channel of record.
    await markNotificationsEmailed(
      user.id,
      pending.map((item) => item.key),
    );
    lines.push(`  skip  ${label} — no delivery channel (email off, no push devices)`);
    skipped += 1;
  }

  return { sent, skipped, failed, transport, lines };
}

/** One push message per digest run: the first alert, or a short summary. */
function buildPushPayload(pending: NotificationItem[]): PushPayload {
  const first = pending[0];

  if (pending.length === 1) {
    return {
      title: alertHeading(first.kind),
      body: `${first.title} — ${first.detail}`,
      url: notificationUrl(first),
      tag: first.key,
    };
  }

  const titles = pending.slice(0, 3).map((item) => item.title);

  return {
    title: `${pending.length} items need your attention`,
    body: titles.join(", ") + (pending.length > titles.length ? "…" : ""),
    url: "/notifications",
  };
}
