import { createAdminClient } from "@/lib/supabase/admin";
import { buildNotifications, notificationLeadMinutes } from "@/lib/notifications";
import { getReport } from "@/lib/data/reports";
import { listTodos } from "@/lib/data/todos";
import { dateKey, nowMinutes } from "@/lib/time";
import { REPORT_REMINDER_HOUR } from "@/lib/gamification";
import type { NotificationItem, Profile } from "@/lib/types";

/**
 * Attach the stored read/emailed flags to a freshly derived notification list.
 * Only those two facts are persisted; everything else comes from the clock and
 * the user's open tasks.
 */
async function withState(
  userId: string,
  items: Omit<NotificationItem, "read" | "emailed">[],
): Promise<NotificationItem[]> {
  if (items.length === 0) {
    return [];
  }

  const keys = [...new Set(items.map((item) => item.key))];

  const { data } = await createAdminClient()
    .from("notification_state")
    .select("notification_key,read_at,emailed_at")
    .eq("user_id", userId)
    .in("notification_key", keys);

  const state = new Map(
    (data ?? []).map((row) => [
      row.notification_key as string,
      {
        read: row.read_at !== null,
        emailed: row.emailed_at !== null,
      },
    ]),
  );

  return items.map((item) => {
    const entry = state.get(item.key);

    return {
      ...item,
      read: entry?.read ?? false,
      emailed: entry?.emailed ?? false,
    };
  });
}

export async function notificationsForUser(
  user: Pick<Profile, "id" | "notify_lead_minutes">,
): Promise<NotificationItem[]> {
  const today = dateKey();

  const [todos, report] = await Promise.all([
    listTodos(user.id),
    getReport(user.id, today),
  ]);

  const items = buildNotifications(todos, notificationLeadMinutes(user), {
    reportMissing: report === null && nowMinutes() >= REPORT_REMINDER_HOUR * 60,
    reportDate: today,
  });

  return withState(user.id, items);
}

export async function unreadNotificationCount(
  user: Pick<Profile, "id" | "notify_lead_minutes">,
): Promise<number> {
  const items = await notificationsForUser(user);

  return items.filter((item) => !item.read).length;
}

/** Only keys that are currently on the user's list may be stored. */
export async function markNotificationRead(
  user: Pick<Profile, "id" | "notify_lead_minutes">,
  key: string,
): Promise<boolean> {
  const items = await notificationsForUser(user);
  const item = items.find((entry) => entry.key === key);

  if (!item) {
    return false;
  }

  const { data: existing } = await createAdminClient()
    .from("notification_state")
    .select("read_at")
    .eq("user_id", user.id)
    .eq("notification_key", key)
    .maybeSingle<{ read_at: string | null }>();

  const { error } = await createAdminClient()
    .from("notification_state")
    .upsert(
      {
        user_id: user.id,
        notification_key: key,
        read_at: existing?.read_at ?? new Date().toISOString(),
      },
      { onConflict: "user_id,notification_key" },
    );

  return !error;
}

export async function markAllNotificationsRead(
  user: Pick<Profile, "id" | "notify_lead_minutes">,
): Promise<number> {
  const items = await notificationsForUser(user);
  const unread = items.filter((item) => !item.read);

  if (unread.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();

  const { error } = await createAdminClient()
    .from("notification_state")
    .upsert(
      unread.map((item) => ({
        user_id: user.id,
        notification_key: item.key,
        read_at: now,
      })),
      { onConflict: "user_id,notification_key" },
    );

  return error ? 0 : unread.length;
}

export async function markNotificationsEmailed(userId: string, keys: string[]): Promise<void> {
  const unique = [...new Set(keys)];

  if (unique.length === 0) {
    return;
  }

  const admin = createAdminClient();

  const { data: alreadySent } = await admin
    .from("notification_state")
    .select("notification_key")
    .eq("user_id", userId)
    .in("notification_key", unique)
    .not("emailed_at", "is", null);

  const sent = new Set(
    (alreadySent ?? []).map((row) => row.notification_key as string),
  );
  const pending = unique.filter((key) => !sent.has(key));

  if (pending.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  await admin.from("notification_state").upsert(
    pending.map((key) => ({
      user_id: userId,
      notification_key: key,
      emailed_at: now,
    })),
    { onConflict: "user_id,notification_key" },
  );
}
