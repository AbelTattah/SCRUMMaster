import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types";

export async function findOrganization(id: string): Promise<Organization | null> {
  const { data } = await (await createServerSupabaseClient())
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Organization>();

  return data ?? null;
}

export async function findOrganizationByName(
  name: string,
  ownerId: string,
): Promise<Organization | null> {
  const { data } = await (await createServerSupabaseClient())
    .from("organizations")
    .select("*")
    .eq("owner_id", ownerId)
    .ilike("name", name)
    .maybeSingle<Organization>();

  return data ?? null;
}

export async function createOrganization(
  name: string,
  ownerId: string,
): Promise<{ organization: Organization | null; error: string | null }> {
  const { data, error } = await (await createServerSupabaseClient())
    .from("organizations")
    .insert({ name, owner_id: ownerId })
    .select()
    .single<Organization>();

  return {
    organization: data ?? null,
    error: error?.message ?? null,
  };
}
