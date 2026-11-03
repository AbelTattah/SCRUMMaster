import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CurrentUser, Organization, Profile } from "@/lib/types";

export async function getAuthUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await createAdminClient()
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

  const { data } = await createAdminClient()
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Organization>();

  return data ?? null;
}

/**
 * The signed-in user plus their profile and organization.
 *
 * A missing profile is repaired here (the database trigger normally creates
 * one) so an interrupted sign-up can never produce a broken session.
 *
 * Wrapped in React's request-scoped cache: the app shell and the page both
 * need the same session, and one Supabase round trip per request is enough.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const authUser = await getAuthUser();

  if (!authUser || !authUser.email) {
    return null;
  }

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
