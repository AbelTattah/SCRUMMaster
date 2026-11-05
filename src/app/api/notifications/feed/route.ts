import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { countTodosCreatedSince } from "@/lib/data/todos";
import { notificationsForUser } from "@/lib/data/notifications";
import { alertableNotifications, todoNudge } from "@/lib/notifications";
import { startOfToday } from "@/lib/time";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * JSON feed polled by the browser notification component. Only actionable
 * notifications (overdue, blocked, starting soon, unfiled report) are
 * returned — "coming up" would just be noise as an OS alert, though it is
 * listed on the notifications page.
 *
 * When the user has not added a single todo today, the feed also carries the
 * periodic planning nudge (see todoNudge) — that is what reminds people to
 * plan their day while the app is open.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [], unread: 0 }, { status: 401 });
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    return NextResponse.json({ items: [], unread: 0 }, { status: 401 });
  }

  const items = await notificationsForUser(profile);
  const alertable = alertableNotifications(items).map((item) => ({
    key: item.key,
    kind: item.kind,
    todo_id: item.todo_id,
    title: item.title,
    detail: item.detail,
    blocker: item.blocker ?? null,
  }));

  // Nothing added yet today → raise the periodic planning nudge alongside
  // the task alerts. Feed-only: it never reaches the bell list or email.
  const nudge = todoNudge();

  if (nudge && (await countTodosCreatedSince(profile.id, startOfToday())) === 0) {
    alertable.push({
      key: nudge.key,
      kind: nudge.kind,
      todo_id: nudge.todo_id,
      title: nudge.title,
      detail: nudge.detail,
      blocker: null,
    });
  }

  return NextResponse.json(
    {
      items: alertable,
      unread: items.filter((item) => !item.read).length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
