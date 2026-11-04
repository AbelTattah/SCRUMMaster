import { NextResponse } from "next/server";

import { removeSubscription } from "@/lib/data/push";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Drop this browser's push subscription (used when alerts are turned off). */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { endpoint?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";

  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  const error = await removeSubscription(user.id, endpoint);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
