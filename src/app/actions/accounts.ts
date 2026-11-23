"use server";

/**
 * Account switching. Supabase keeps one auth session per browser (cookies),
 * so switching account means replacing that session with the target account's
 * saved refresh token. The token is sent from this browser's local account
 * registry (never from the server) and is scoped to this app's own client.
 *
 * The E2EE key package for each account is kept in this browser's IndexedDB
 * (see lib/accounts.ts) — the server only ever sees the opaque token.
 */
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SwitchResult {
  error: string | null;
}

/** Replace the current Supabase session with the supplied account's tokens. */
export async function switchAccountSession(formData: FormData): Promise<SwitchResult> {
  const refreshToken = String(formData.get("refresh_token") ?? "");
  const accessToken = String(formData.get("access_token") ?? "");
  const userId = String(formData.get("user_id") ?? "");

  if (!refreshToken || !userId) {
    return { error: "That account has no saved session on this device. Sign in to it again." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken || refreshToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return { error: error?.message ?? "Could not switch account." };
  }

  // A real session always wins over guest mode.
  const store = await cookies();
  store.delete("scrum-guest");
  store.delete("scrum-offline-session");
  store.delete("scrum-offline-hint");

  revalidatePath("/", "layout");

  return { error: null };
}

/**
 * Leave the current account so another can be signed in, WITHOUT wiping the
 * local account registry or E2EE keys (unlike the full sign-out button).
 */
export async function signOutToAddAccount(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut().catch(() => undefined);

  // Clear every Supabase auth cookie (same as the full sign-out) — otherwise
  // the stale session keeps requireGuest() from showing the sign-in screen.
  const store = await cookies();
  store.delete("scrum-guest");
  store.delete("scrum-offline-session");
  store.delete("scrum-offline-hint");
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      store.delete(cookie.name);
    }
  }

  redirect("/login?next=/");
}
