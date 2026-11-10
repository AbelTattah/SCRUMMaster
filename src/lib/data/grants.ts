import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export interface MemberGrantStatus {
  /** The member's raw ECDH public key (plain — safe to send to the owner). */
  pub: string | null;
  /** Has an organization key grant been stored for them yet? */
  needsGrant: boolean;
}

/**
 * Which members of an organization still need their organization-key grant.
 *
 * Everything read here is public material (salt-style metadata and raw
 * public keys) — the wrapped keys themselves are never touched. Used by the
 * team page to render the "Activate" button.
 */
export async function memberGrantStatus(
  organizationId: string,
  excludeId: string,
): Promise<Record<string, MemberGrantStatus>> {
  const supabase = await createServerSupabaseClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .neq("id", excludeId);

  const status: Record<string, MemberGrantStatus> = {};

  for (const profile of profiles ?? []) {
    const { data } = await createAdminClient().auth.admin.getUserById(profile.id);
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const pub = typeof meta.crypto_pub === "string" && meta.crypto_pub ? meta.crypto_pub : null;

    status[profile.id] = {
      pub,
      needsGrant: pub !== null && typeof meta.crypto_org_grant !== "string",
    };
  }

  return status;
}
