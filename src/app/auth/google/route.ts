import { NextResponse } from "next/server";

import { siteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=%2F`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Google sign-in is not available right now.")}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(data.url);
}
