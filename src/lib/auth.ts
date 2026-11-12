import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import {
  OFFLINE_HINT_COOKIE,
  OFFLINE_SESSION_COOKIE,
  decodeSession,
} from "@/lib/offlineSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CurrentUser, Organization, Profile } from "@/lib/types";

/**
 * True for the bundled desktop server (set by Electron before requiring
 * server.js). The web deployment never sets it, so all offline fallbacks are
 * strictly desktop-only.
 */
export function isDesktopServer(): boolean {
  return process.env.SCRUM_DESKTOP === "1";
}

/**
 * True when the desktop shell already knows there is no network (the boot
 * probe in main.js failed). The server then skips every network call instead
 * of waiting for a timeout on each request.
 */
export function isServerOffline(): boolean {
  return process.env.SCRUM_OFFLINE === "1";
}

/** Server: the cached session left by the client for offline boots. */
async function cachedSession(): Promise<CurrentUser | null> {
  if (!isDesktopServer()) {
    return null;
  }

  try {
    const store = await cookies();
    return decodeSession(store.get(OFFLINE_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Server: the renderer told us it has no connectivity. */
export async function isOfflineHint(): Promise<boolean> {
  if (isServerOffline()) {
    return true;
  }

  try {
    const store = await cookies();
    return store.get(OFFLINE_HINT_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/** Server: the visitor explicitly chose guest mode. */
async function isGuestCookie(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get("scrum-guest")?.value === "1";
  } catch {
    return false;
  }
}

/**
 * The signed-in user from the server, plus the reason there is none.
 *
 * "No session" and "could not reach the server" look the same to the caller,
 * so they are told apart here: only a genuine server answer (no network
 * error) means the user is really signed out.
 */
export async function getAuthUser(): Promise<{
  user: User | null;
  offline: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    return { user, offline: false };
  }

  return { user: null, offline: isNetworkError(error) };
}

/** True when a Supabase error was a connectivity problem, not an auth one. */
function isNetworkError(error: { message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("getaddrinfo") ||
    message.includes("enotfound") ||
    message.includes("failed to fetch")
  );
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();

  return data ?? null;
}

export async function getOrganization(id: string | null): Promise<Organization | null> {
  if (!id) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Organization>();

  return data ?? null;
}

/**
 * The signed-in user plus their profile and organization.
 *
 * Offline-first (desktop): the cached local session is authoritative when it
 * exists, so the shell renders with zero network calls. Supabase is consulted
 * only when there is no cached session (first sign-in) or on the web. Every
 * network step is guarded so a dropped connection can never blank the app.
 *
 * Wrapped in React's request-scoped cache: the app shell and the page both
 * need the same session.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Guest mode is an explicit choice: it always wins over a cached session
  // (on the desktop app the cached session would otherwise shadow it).
  if (await isGuestCookie()) {
    return null;
  }

  // Desktop, reported offline by the renderer: serve the cached session
  // directly. No network call is attempted, so the shell opens instantly.
  if (isDesktopServer() && (await isOfflineHint())) {
    const cached = await cachedSession();
    if (cached) {
      return cached;
    }
  }

  let authUser;
  let authOffline = false;

  try {
    const result = await getAuthUser();
    authUser = result.user;
    authOffline = result.offline;
  } catch {
    // The auth call itself blew up - treat it as a connectivity problem.
    return isDesktopServer() ? await cachedSession() : null;
  }

  if (!authUser || !authUser.email) {
    // No session from the server. When the server could not be reached we
    // keep the desktop app working from the cached local session. A genuine
    // answer means the user really is signed out, so they get the auth page.
    if (isDesktopServer() && (authOffline || isServerOffline())) {
      const cached = await cachedSession();

      if (cached) {
        return cached;
      }
    }

    return null;
  }

  try {
    let profile = await getProfile(authUser.id);

    if (!profile) {
      const name =
        (typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name) ||
        authUser.email.split("@")[0];

      await createAdminClient()
        .from("profiles")
        .insert({
          id: authUser.id,
          name,
          email: authUser.email.toLowerCase(),
        })
        .select()
        .maybeSingle();

      profile = await getProfile(authUser.id);
    }

    if (!profile) {
      return null;
    }

    // First authenticated load of an invitee: the invitation has been used.
    if (profile.invited_at) {
      profile = { ...profile, invited_at: null };

      await createAdminClient()
        .from("profiles")
        .update({ invited_at: null })
        .eq("id", profile.id);
    }

    const organization = await getOrganization(profile.organization_id);
    const hasPassword = (authUser.identities ?? []).some(
      (identity) => identity.provider === "email",
    );

    return {
      id: authUser.id,
      email: authUser.email,
      profile,
      organization,
      isOwner: organization !== null && organization.owner_id === authUser.id,
      hasPassword,
    };
  } catch {
    // Network vanished mid-request: a stale cached session is still better
    // than a blank screen.
    return (await cachedSession()) ?? null;
  }
});

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login?notice=" + encodeURIComponent("Please sign in to continue."));
  }

  return current;
}

/** Signed-in users who have not finished choosing their account type. */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const current = await requireUser();

  if (!current.profile.onboarding_complete) {
    redirect("/register/type");
  }

  return current;
}

export function isOrgOwner(current: Pick<CurrentUser, "isOwner">): boolean {
  return current.isOwner;
}

export async function requireGuest(): Promise<void> {
  const current = await getCurrentUser();

  if (current) {
    redirect(current.profile.onboarding_complete ? "/" : "/register/type");
  }
}
