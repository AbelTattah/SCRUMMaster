import type { NotificationItem, NotificationKind, Profile, Todo } from "@/lib/types";
import { formatMinutes, formatTime, normalizeTime, nowMinutes } from "@/lib/time";

/** Lead-time choices offered on the settings page (minutes). */
export const NOTIFICATION_LEAD_OPTIONS = [5, 10, 15, 30, 60, 120] as const;

export const NOTIFICATION_DEFAULT_LEAD = 30;

export function notificationLeadMinutes(profile: Pick<Profile, "notify_lead_minutes"> | null): number {
  const value = Number(profile?.notify_lead_minutes ?? NOTIFICATION_DEFAULT_LEAD);

  return (NOTIFICATION_LEAD_OPTIONS as readonly number[]).includes(value)
    ? value
    : NOTIFICATION_DEFAULT_LEAD;
}

/**
 * Turn the user's open todos into the notification list.
 *
 * Each todo produces at most one item — the most urgent state wins:
 *   overdue   still open and its end time has passed
 *   reminder  starting within the lead window, or under way
 *   upcoming  later today
 */
export function buildNotifications(
  todos: Pick<Todo, "id" | "title" | "completed" | "start_time" | "end_time">[],
  leadMinutes: number,
  now: number = nowMinutes(),
): Omit<NotificationItem, "read" | "emailed">[] {
  const lead = Math.max(0, leadMinutes);
  const items: Omit<NotificationItem, "read" | "emailed">[] = [];

  for (const todo of todos) {
    if (todo.completed) {
      continue;
    }

    const title = todo.title;
    const startTime = normalizeTime(todo.start_time);
    const endTime = normalizeTime(todo.end_time);

    const start = startTime ? toMinutes(startTime) : null;
    const end = endTime ? toMinutes(endTime) : null;

    if (end !== null && end < now) {
      items.push({
        key: `todo:${todo.id}:overdue`,
        kind: "overdue",
        todo_id: todo.id,
        title,
        detail: `Was due at ${formatTime(endTime!)}`,
        start_time: startTime,
        end_time: endTime,
        sort: end,
      });
      continue;
    }

    if (start === null) {
      continue;
    }

    if (start <= now + lead) {
      const detail =
        start > now
          ? `Starts in ${formatMinutes(start - now)}`
          : endTime
            ? `Happening now — until ${formatTime(endTime)}`
            : `Started at ${formatTime(startTime!)}`;

      items.push({
        key: `todo:${todo.id}:reminder`,
        kind: "reminder",
        todo_id: todo.id,
        title,
        detail,
        start_time: startTime,
        end_time: endTime,
        sort: start,
      });
      continue;
    }

    items.push({
      key: `todo:${todo.id}:upcoming`,
      kind: "upcoming",
      todo_id: todo.id,
      title,
      detail: `Starts at ${formatTime(startTime!)}`,
      start_time: startTime,
      end_time: endTime,
      sort: start,
    });
  }

  const rank: Record<NotificationKind, number> = {
    overdue: 0,
    reminder: 1,
    upcoming: 2,
  };

  return items.sort((a, b) => rank[a.kind] - rank[b.kind] || a.sort - b.sort);
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);

  return hour * 60 + minute;
}

export function notificationKindLabel(kind: NotificationKind): string {
  return kind === "overdue" ? "Overdue" : kind === "reminder" ? "Reminders" : "Coming up";
}

export function notificationKindHint(kind: NotificationKind): string {
  return kind === "overdue"
    ? "Still open and past their end time."
    : kind === "reminder"
      ? "Starting soon or happening right now."
      : "Scheduled for later today.";
}

/** "Coming up" is listed on the screen but would be noise as an OS alert. */
export function alertableNotifications(items: NotificationItem[]): NotificationItem[] {
  return items.filter(
    (item) => !item.read && (item.kind === "overdue" || item.kind === "reminder"),
  );
}

export function notificationDigest(
  items: NotificationItem[],
  profile: Pick<Profile, "name">,
): { subject: string; text: string; html: string } {
  const name = profile.name || "there";
  const actionable = items.filter(
    (item) => item.kind === "overdue" || item.kind === "reminder",
  ).length;

  const subject =
    actionable === 0
      ? "Scrum Master — your day at a glance"
      : actionable === 1
        ? "Scrum Master — 1 task needs your attention"
        : `Scrum Master — ${actionable} tasks need your attention`;

  const intro =
    actionable === 0
      ? "Here is your day at a glance:"
      : "Here is what needs your attention today:";

  let text = `Hello ${name},\n\n${intro}\n\n`;
  let html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">' +
    '<h1 style="font-size:20px;font-weight:600;margin:0 0 4px;">Scrum Master</h1>' +
    `<p style="font-size:14px;color:#727272;margin:0 0 8px;">Hello ${escapeHtml(name)},</p>` +
    `<p style="font-size:14px;color:#727272;margin:0 0 20px;">${escapeHtml(intro)}</p>`;

  for (const kind of ["overdue", "reminder", "upcoming"] as NotificationKind[]) {
    const group = items.filter((item) => item.kind === kind);

    if (group.length === 0) {
      continue;
    }

    const label = notificationKindLabel(kind);
    const hint = notificationKindHint(kind);

    text += `${label.toUpperCase()} — ${hint}\n`;
    group.forEach((item) => {
      text += `- ${item.title}\n  ${item.detail}\n`;
    });
    text += "\n";

    html +=
      `<h2 style="font-size:15px;font-weight:600;color:#21005D;margin:22px 0 2px;">${escapeHtml(label)}</h2>` +
      `<p style="font-size:12px;color:#727272;margin:0 0 8px;">${escapeHtml(hint)}</p>` +
      '<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">';

    group.forEach((item) => {
      html +=
        `<li><strong>${escapeHtml(item.title)}</strong><br>` +
        `<span style="color:#727272;">${escapeHtml(item.detail)}</span></li>`;
    });

    html += "</ul>";
  }

  text += "Change these emails in Scrum Master → Settings.\n";
  html +=
    '<p style="font-size:12px;color:#727272;margin:26px 0 0;">' +
    "Change these emails in Scrum Master → Settings.</p></div>";

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
