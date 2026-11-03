import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { notificationsForUser } from "@/lib/data/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * JSON feed polled by the browser notification component. Only actionable
 * notifications (overdue and starting soon) are returned — "coming up" would
 * just be noise as an OS alert, though it is listed on the notifications page.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const items = await notificationsForUser(profile);
  const alertable = items
    .filter((item) => !item.read && (item.kind === "overdue" || item.kind === "reminder"))
    .map((item) => ({
      key: item.key,
      kind: item.kind,
      todo_id: item.todo_id,
      title: item.title,
      detail: item.detail,
    }));

  return NextResponse.json(
    { items: alertable },
    { headers: { "Cache-Control": "no-store" } },
  );
}
