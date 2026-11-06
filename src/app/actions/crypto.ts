"use server";

/**
 * Key-material lifecycle. Everything stored here is ciphertext or public
 * data (salts, wrapped packages, public keys, org-key grants) — the server
 * never derives or sees a key, and never can.
 *
 * Storage: auth user_metadata (no schema change needed).
 */
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CryptoMaterial {
  salt: string | null;
  wrapped: string | null;
  pub: string | null;
  /** Recovery-phrase-wrapped key package (ciphertext). */
  recovery: string | null;
  /** Owner's own organization key, wrapped with their DEK. */
  org_wrapped: string | null;
  /** Member's organization key grant (ECIES to their public key). */
  org_grant: string | null;
  org_pending: boolean;
  has_password: boolean;
}

const LIMITS: Record<string, number> = {
  crypto_salt: 64,
  crypto_wrapped: 4096,
  crypto_pub: 128,
  crypto_recovery: 8192,
  crypto_org_wrapped: 512,
  crypto_org_grant: 2048,
};

const B64 = /^[A-Za-z0-9+/=_\-.]+$/;

function readMetadata(metadata: Record<string, unknown> | null | undefined) {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null => {
    const value = meta[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  return {
    salt: str("crypto_salt"),
    wrapped: str("crypto_wrapped"),
    pub: str("crypto_pub"),
    recovery: str("crypto_recovery"),
    org_wrapped: str("crypto_org_wrapped"),
    org_grant: str("crypto_org_grant"),
    org_pending: meta.crypto_org_pending === true,
  };
}

/** The signed-in user's stored key material (ciphertext blobs). */
export async function getCryptoMaterial(): Promise<CryptoMaterial> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      salt: null,
      wrapped: null,
      pub: null,
      recovery: null,
      org_wrapped: null,
      org_grant: null,
      org_pending: false,
      has_password: false,
    };
  }

  const hasPassword = (user.identities ?? []).some(
    (identity) => identity.provider === "email",
  );

  return { ...readMetadata(user.user_metadata), has_password: hasPassword };
}

/**
 * Merge a patch into the user's crypto metadata. Unknown keys are preserved;
 * values are length- and format-checked so the metadata cannot be bloated.
 */
export async function saveCryptoMaterial(patch: {
  salt?: string | null;
  wrapped?: string | null;
  pub?: string | null;
  recovery?: string | null;
  org_wrapped?: string | null;
  org_grant?: string | null;
  org_pending?: boolean;
  /** Drop the org grant (a fresh identity key makes old grants unusable). */
  clear_org_grant?: boolean;
}): Promise<{ error: string | null }> {
  // requireUser, not requireOnboardedUser: the recovery phrase is saved at
  // the end of registration, before onboarding is complete.
  const current = await requireUser();

  const names: Record<keyof typeof patch, string> = {
    salt: "crypto_salt",
    wrapped: "crypto_wrapped",
    pub: "crypto_pub",
    recovery: "crypto_recovery",
    org_wrapped: "crypto_org_wrapped",
    org_grant: "crypto_org_grant",
    org_pending: "crypto_org_pending",
    clear_org_grant: "",
  };

  const patchMeta: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    const metaKey = names[key as keyof typeof patch];

    if (key === "clear_org_grant") {
      if (value) {
        patchMeta.crypto_org_grant = null;
        patchMeta.crypto_org_pending = null;
      }
      continue;
    }

    if (typeof value === "boolean") {
      patchMeta[metaKey] = value;
      continue;
    }

    if (value === null) {
      patchMeta[metaKey] = null;
      continue;
    }

    const limit = LIMITS[metaKey];

    if (typeof value !== "string" || value.length > limit || !B64.test(value)) {
      return { error: "Invalid encryption material." };
    }

    patchMeta[metaKey] = value;
  }

  const admin = createAdminClient();
  const { data: authUser, error: readError } = await admin.auth.admin.getUserById(current.id);

  if (readError || !authUser.user) {
    return { error: "Could not read your account." };
  }

  // Never replace a stored organization key: a different wrap would orphan
  // every task encrypted under the stored one (racing first-unlocks included).
  if (patchMeta.crypto_org_wrapped) {
    const existing = readMetadata(authUser.user.user_metadata);

    if (existing.org_wrapped && existing.org_wrapped !== patchMeta.crypto_org_wrapped) {
      delete patchMeta.crypto_org_wrapped;
    }
  }

  const merged = { ...authUser.user.user_metadata, ...patchMeta };

  const { error } = await admin.auth.admin.updateUserById(current.id, {
    user_metadata: merged,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/** Members of my organization who have a public key but no grant yet. */
export async function listKeyGrantsNeeded(): Promise<
  { id: string; name: string; pub: string }[]
> {
  const current = await requireUser();

  if (!current.isOwner || !current.organization) {
    return [];
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,name")
    .eq("organization_id", current.organization.id)
    .neq("id", current.id)
    .order("name");

  const needed: { id: string; name: string; pub: string }[] = [];

  for (const profile of profiles ?? []) {
    const { data } = await admin.auth.admin.getUserById(profile.id);

    if (!data.user) {
      continue;
    }

    const meta = readMetadata(data.user.user_metadata);

    if (meta.pub && !meta.org_grant) {
      needed.push({ id: profile.id, name: profile.name, pub: meta.pub });
    }
  }

  return needed;
}

/** Hand an organization key grant to one member (owner only). */
export async function grantOrgKeyToMember(
  memberId: string,
  grant: string,
): Promise<{ error: string | null }> {
  const current = await requireUser();

  if (!current.isOwner || !current.organization) {
    return { error: "Only the organization owner can share the key." };
  }

  if (!memberId || grant.length > LIMITS.crypto_org_grant || !B64.test(grant.replace(/\./g, ""))) {
    return { error: "Invalid grant." };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("profiles")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", current.organization.id)
    .maybeSingle<{ id: string }>();

  if (!member) {
    return { error: "That member is not in your organization." };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(memberId);

  if (!authUser.user) {
    return { error: "That member has no account yet." };
  }

  const meta = readMetadata(authUser.user.user_metadata);

  if (!meta.pub) {
    return { error: "That member has not set up encryption yet." };
  }

  const merged = {
    ...authUser.user.user_metadata,
    crypto_org_grant: grant,
    crypto_org_pending: null,
  };

  const { error } = await admin.auth.admin.updateUserById(memberId, {
    user_metadata: merged,
  });

  return { error: error?.message ?? null };
}

function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < 8) {
    return "Your password must be at least 8 characters.";
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Your password is too long (max 72 characters).";
  }

  if (password !== confirm) {
    return "The two passwords do not match.";
  }

  return null;
}

/**
 * Change the account password and re-wrap the key package under the new
 * password in one action — either both land or neither does, so the stored
 * package is never left wrapped for a password the user no longer has.
 *
 * The salt is deliberately kept: the recovery phrase wraps the same package
 * under PBKDF2(mnemonic, salt), so rotating the salt would silently break it.
 */
export async function changePasswordWithCrypto(input: {
  current: string;
  next: string;
  confirm: string;
  salt: string;
  wrapped: string;
}): Promise<{ error: string | null }> {
  const problem = passwordProblem(input.next, input.confirm);

  if (problem) {
    return { error: problem };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Sign in again." };
  }

  const email = user.email;

  if (!email) {
    return { error: "Your account has no email address." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: input.current,
  });

  if (verifyError) {
    return { error: "Your current password is not correct." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: input.next,
  });

  if (passwordError) {
    return { error: passwordError.message };
  }

  return saveCryptoMaterial({ salt: input.salt, wrapped: input.wrapped });
}

/**
 * Set a new password from the reset link. Two modes:
 *   • with the recovery phrase — the existing key package is unwrapped and
 *     re-wrapped, so every task stays readable (and the phrase keeps working);
 *   • without it — a fresh package is installed; old ciphertext becomes
 *     permanently unreadable (the caller warns about this first).
 */
export async function resetPasswordWithCrypto(input: {
  password: string;
  confirm: string;
  salt: string;
  wrapped: string;
  pub?: string | null;
  recovery?: string | null;
}): Promise<{ error: string | null }> {
  const problem = passwordProblem(input.password, input.confirm);

  if (problem) {
    return { error: problem };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "That reset link has expired. Request a new one." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (passwordError) {
    return { error: passwordError.message };
  }

  const freshIdentity = Boolean(input.pub);

  return saveCryptoMaterial({
    salt: input.salt,
    wrapped: input.wrapped,
    ...(input.pub ? { pub: input.pub } : {}),
    // A fresh identity invalidates the old phrase and any org grant.
    ...(freshIdentity ? { recovery: input.recovery ?? null } : {}),
    ...(freshIdentity ? { clear_org_grant: true } : {}),
    ...(freshIdentity ? { org_pending: true } : {}),
  });
}

/**
 * First password for an account that signed up without one (OAuth legacy):
 * install a brand-new key package alongside it.
 */
export async function provisionPassword(input: {
  password: string;
  confirm: string;
  salt: string;
  wrapped: string;
  pub: string;
}): Promise<{ error: string | null }> {
  const problem = passwordProblem(input.password, input.confirm);

  if (problem) {
    return { error: problem };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in first." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (passwordError) {
    return { error: passwordError.message };
  }

  return saveCryptoMaterial({
    salt: input.salt,
    wrapped: input.wrapped,
    pub: input.pub,
  });
}

/** Validate the signed-in user still exists (used by the unlock gate). */
export async function cryptoSessionCheck(): Promise<{ signedIn: boolean }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { signedIn: Boolean(user) };
}
