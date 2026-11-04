import { notificationRecipients, findProfileByEmail } from "@/lib/data/profiles";
import { markNotificationsEmailed, notificationsForUser } from "@/lib/data/notifications";
import { notificationDigest } from "@/lib/notifications";
import { mailTransport, sendMail } from "@/lib/mail";

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

/**
 * Send the notification email digest.
 *
 * Overdue tasks, blockers, tasks that start within the user's reminder
 * window and an unfiled daily report trigger an email; tasks coming up later
 * today are included as a preview. A notification is emailed at most once
 * (notification_state).
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

    if (!user.notify_email) {
      lines.push(`  skip  ${label} — email notifications are off`);
      skipped += 1;
      continue;
    }

    const items = await notificationsForUser(user);
    const pending = items.filter(
      (item) =>
        !item.emailed &&
        (item.kind === "overdue" ||
          item.kind === "blocker" ||
          item.kind === "reminder" ||
          item.kind === "report"),
    );

    if (pending.length === 0) {
      lines.push(`  skip  ${label} — nothing new needs attention`);
      skipped += 1;
      continue;
    }

    const digest = notificationDigest(items, user);

    if (options.dryRun) {
      lines.push(`  would send  ${label} — ${digest.subject}`);

      for (const item of pending) {
        lines.push(`      • ${item.title} — ${item.detail}`);
      }

      sent += 1;
      continue;
    }

    const result = await sendMail({
      to: user.email,
      subject: digest.subject,
      text: digest.text,
      html: digest.html,
      userId: user.id,
    });

    if (!result.ok) {
      lines.push(`  FAIL  ${label} — ${result.error ?? "unknown mail error"}`);
      failed += 1;
      continue;
    }

    await markNotificationsEmailed(
      user.id,
      pending.map((item) => item.key),
    );

    lines.push(`  sent  ${label} — ${digest.subject}`);
    sent += 1;
  }

  return { sent, skipped, failed, transport, lines };
}
