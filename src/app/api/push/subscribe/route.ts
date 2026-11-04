import { NextResponse } from "next/server";

import { parseSubscription, upsertSubscription } from "@/lib/data/push";
import { pushConfigured } from "@/lib/push";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Register (or refresh) this browser's push subscription for the signed-in user. */
export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push is not configured." }, { status: 501 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to enable push alerts." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subscription = parseSubscription(body);

  if (!subscription) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const error = await upsertSubscription(
    user.id,
    subscription,
    request.headers.get("user-agent"),
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
