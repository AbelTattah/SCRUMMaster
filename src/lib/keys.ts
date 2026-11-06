/**
 * Session key lifecycle: provision, unlock, restore-from-device, and the
 * organization key handshake.
 *
 * The unlocked key package lives in memory and in IndexedDB (this device's
 * copy — wiping it on sign-out is what keeps the account private on a shared
 * machine). Password and recovery unlocks re-derive from the wrapped blobs
 * stored server-side; the server only ever sees ciphertext.
 */
import {
  createAccountMaterial,
  createOrgKey,
  deriveKek,
  deriveRecoveryKek,
  decryptJson,
  encryptJson,
  grantOrgKey,
  importDek,
  importPrivateKey,
  openAccountMaterial,
  openOrgGrant,
  openOrgKey,
  openWithRecovery,
  rewrapPackage,
  type AccountMaterial,
  type KeyPackage,
} from "@/lib/crypto";
import { getMeta, setMeta, deleteMeta } from "@/lib/localdb";
import {
  getCryptoMaterial,
  listKeyGrantsNeeded,
  grantOrgKeyToMember,
  provisionPassword,
  requestOrgKeyGrant,
  saveCryptoMaterial,
  type CryptoMaterial,
} from "@/app/actions/crypto";

export interface UnlockedSession {
  salt: string;
  pub: string;
  pkg: KeyPackage;
  dek: CryptoKey;
  priv: CryptoKey;
  /** Present for organization members (owner mints, members receive grants). */
  orgKey?: CryptoKey;
}

export interface OrgContext {
  isOwner: boolean;
  inOrg: boolean;
}

export type UnlockResult = { error: string | null; waiting?: boolean };

let session: UnlockedSession | null = null;
let materialCache: CryptoMaterial | null = null;

/** The unlocked keys for this tab (null while locked). */
export function keys(): UnlockedSession | null {
  return session;
}

export function orgKey(): CryptoKey | null {
  return session?.orgKey ?? null;
}

/**
 * The key that encrypts task content: the organization key inside an
 * organization, the personal data key otherwise.
 */
export function contentKey(): CryptoKey | null {
  return session?.orgKey ?? session?.dek ?? null;
}

export function isUnlocked(): boolean {
  if (!session) {
    return false;
  }

  return true;
}

function requireKeys(): UnlockedSession {
  if (!session) {
    throw new Error("The app is locked.");
  }

  return session;
}

/* --------------------------------------------------------- device store */

interface StoredKeys {
  salt: string;
  pub: string;
  pkg: KeyPackage;
}

async function storeKeys(material: Pick<AccountMaterial, "salt" | "pub" | "pkg">): Promise<void> {
  await setMeta("keys", { salt: material.salt, pub: material.pub, pkg: material.pkg });
}

async function readStoredKeys(): Promise<StoredKeys | null> {
  return (await getMeta<StoredKeys>("keys")) ?? null;
}

/** Forget the unlocked keys (used on sign-out; the full wipe clears more). */
export function clearKeys(): void {
  session = null;
  materialCache = null;
  void deleteMeta("keys");
}

/* ------------------------------------------------------------- material */

export interface MaterialFetch {
  material: CryptoMaterial | null;
  /** "server" — fresh from the API; "cache" — offline; "none" — signed out. */
  source: "server" | "cache" | "none";
}

/**
 * The user's wrapped key material: fetched from the server when possible,
 * cached in IndexedDB so a device can still unlock (and decrypt) offline.
 * The source matters — callers must never treat "unreachable" as "absent".
 *
 * On the "server" source the material object is returned even without a
 * salt (it still carries `has_password`, which decides whether provisioning
 * has to set the auth password too).
 */
export async function fetchMaterial(): Promise<MaterialFetch> {
  try {
    const material = await getCryptoMaterial();

    if (material.salt) {
      materialCache = material;
      await setMeta("material", material);
      return { material, source: "server" };
    }

    // The server answered: this account genuinely has no material yet.
    materialCache = null;
    await deleteMeta("material");
    return { material, source: "server" };
  } catch {
    const cached = (await getMeta<CryptoMaterial>("material")) ?? materialCache;

    if (cached?.salt) {
      return { material: cached, source: "cache" };
    }

    return { material: null, source: "none" };
  }
}

async function cachedMaterial(): Promise<CryptoMaterial | null> {
  if (materialCache) {
    return materialCache;
  }

  materialCache = (await getMeta<CryptoMaterial>("material")) ?? null;
  return materialCache;
}

/* -------------------------------------------------------- org handshake */

/**
 * Make sure the session can read the organization's tasks:
 *   • owner — open their wrapped org key, or mint one the first time;
 *   • member — open the owner's grant, or ask for one (→ waiting state).
 */
async function resolveOrgKey(
  mat: CryptoMaterial | null,
  ctx: OrgContext,
): Promise<{ key?: CryptoKey; waiting?: boolean; error?: string }> {
  if (!ctx.inOrg || !session) {
    return {};
  }

  if (ctx.isOwner) {
    if (mat?.org_wrapped) {
      try {
        return { key: await openOrgKey(session.dek, mat.org_wrapped) };
      } catch {
        // The stored key would not open with this device's key. Never mint a
        // replacement here: a new key would orphan every task encrypted under
        // the stored one. Fall through to a fresh server read, then report.
      }
    }

    // Stale-cache guard: the cached material may predate a wrap the server
    // already has (a re-mint would orphan all organization tasks), so ask the
    // server before ever minting.
    const fresh = await fetchMaterial();
    const stored = fresh.material?.org_wrapped;

    if (stored) {
      try {
        return { key: await openOrgKey(session.dek, stored) };
      } catch {
        return { error: "The organization key on file could not be opened." };
      }
    }

    // Truly absent on the server: mint once. saveCryptoMaterial refuses to
    // overwrite an existing wrap, and the session adopts whatever the server
    // actually kept - racing unlocks always converge on one key.
    const { wrapped } = await createOrgKey(session.dek);

    try {
      const saved = await saveCryptoMaterial({ org_wrapped: wrapped });

      if (saved.error) {
        return { error: saved.error };
      }
    } catch {
      return { error: "You are offline - reconnect to set up the organization key." };
    }

    const final = await fetchMaterial();
    const useWrap = final.material?.org_wrapped;

    if (!useWrap) {
      return { error: "The organization key could not be saved." };
    }

    try {
      return { key: await openOrgKey(session.dek, useWrap) };
    } catch {
      return { error: "The organization key could not be opened." };
    }
  }

  // Member.
  if (mat?.org_grant && session) {
    try {
      return { key: await openOrgGrant(session.priv, mat.org_grant) };
    } catch {
      // A stale grant (identity rotated) — request a fresh one below.
    }
  }

  if (mat && !mat.org_pending) {
    await requestOrgKeyGrant().catch(() => undefined);
  }

  return { waiting: true };
}

/** The owner's background pass: hand the org key to anyone still waiting. */
export async function grantPendingMembers(): Promise<number> {
  const mat = session ? (await fetchMaterial()).material : null;

  if (!mat?.org_wrapped || !session?.orgKey) {
    return 0;
  }

  try {
    const needed = await listKeyGrantsNeeded();
    let granted = 0;

    for (const member of needed) {
      const grant = await grantOrgKey(member.pub, session.orgKey);
      const { error } = await grantOrgKeyToMember(member.id, grant);

      if (!error) {
        granted += 1;
      }
    }

    return granted;
  } catch {
    return 0; // offline or signed out — try again next session
  }
}

/* ------------------------------------------------------------- unlocking */

async function finishUnlock(
  opened: { pkg: KeyPackage; keys: { dek: CryptoKey; priv: CryptoKey } },
  salt: string,
  pub: string,
  mat: CryptoMaterial | null,
  ctx: OrgContext,
): Promise<UnlockResult> {
  session = {
    salt,
    pub,
    pkg: opened.pkg,
    dek: opened.keys.dek,
    priv: opened.keys.priv,
  };

  // Persist before the org handshake: the device keeps the package even if
  // the grant has not arrived yet (the waiting screen re-checks for it).
  await storeKeys({ salt, pub, pkg: opened.pkg });

  const org = await resolveOrgKey(mat, ctx);

  if (org.error) {
    session = null;
    return { error: org.error };
  }

  if (org.key) {
    session.orgKey = org.key;
  }

  if (ctx.inOrg && !session.orgKey) {
    const waiting = Boolean(org.waiting);
    session = null;

    return waiting
      ? { error: "Waiting for the organization key.", waiting: true }
      : { error: "Could not open the organization key." };
  }

  if (ctx.isOwner && session.orgKey) {
    void grantPendingMembers();
  }

  return { error: null };
}

/** Unlock with the account password (fetches the wrapped blobs). */
export async function unlockWithPassword(
  password: string,
  ctx: OrgContext,
): Promise<UnlockResult> {
  const fetched = await fetchMaterial();

  if (fetched.source === "none") {
    return { error: "You are offline and this device has no saved keys." };
  }

  const mat = fetched.material;

  if (!mat?.salt || !mat.wrapped) {
    return { error: "This account has no encryption keys yet." };
  }

  let opened: { pkg: KeyPackage; keys: { dek: CryptoKey; priv: CryptoKey } };

  try {
    opened = await openAccountMaterial(password, { salt: mat.salt, wrapped: mat.wrapped });
  } catch {
    return { error: "That password could not unlock this account." };
  }

  return finishUnlock(opened, mat.salt, mat.pub ?? "", mat, ctx);
}

/**
 * Sign-in path for an account created before encryption existed: build the
 * key package from the password they just used and save it. Their old
 * plaintext todos keep working (values without the envelope pass through).
 *
 * Only runs when the server confirms the account has no material — a network
 * hiccup must never be mistaken for "no keys" and overwrite the wrapped blob.
 */
export async function provisionAndUnlock(
  password: string,
  ctx: OrgContext,
): Promise<UnlockResult> {
  const fetched = await fetchMaterial();

  if (fetched.source !== "server") {
    return { error: "Could not reach the server to check this account." };
  }

  if (fetched.material?.salt) {
    // Keys appeared in the meantime — normal unlock instead.
    return unlockWithPassword(password, ctx);
  }

  const material = await createAccountMaterial(password);
  const input = {
    password,
    confirm: password,
    salt: material.salt,
    wrapped: material.wrapped,
    pub: material.pub,
  };
  // No password on the auth user yet (the generated-key screen): install it
  // in the same server action as the material so both land together.
  const saved =
    fetched.material && !fetched.material.has_password
      ? await provisionPassword(input)
      : await saveCryptoMaterial({
          salt: material.salt,
          wrapped: material.wrapped,
          pub: material.pub,
        });

  if (saved.error) {
    return { error: saved.error };
  }

  const mat = (await fetchMaterial()).material;

  return finishUnlock(
    { pkg: material.pkg, keys: material.keys },
    material.salt,
    material.pub,
    mat,
    ctx,
  );
}

/**
 * Restore the keys this device already holds — no password prompt, works
 * offline. Returns false when the device has never unlocked this account.
 */
export async function restoreFromDevice(ctx: OrgContext): Promise<boolean> {
  const stored = await readStoredKeys();

  if (!stored) {
    return false;
  }

  try {
    const dek = await importDek(stored.pkg.dek);
    const priv = await importPrivateKey(stored.pkg.priv);
    const mat = await cachedMaterial();

    session = {
      salt: stored.salt,
      pub: stored.pub,
      pkg: stored.pkg,
      dek,
      priv,
    };

    const org = await resolveOrgKey(mat, ctx);

    if (org.error) {
      session = null;
      return false;
    }

    if (org.key) {
      session.orgKey = org.key;
    }

    if (ctx.inOrg && !session.orgKey) {
      const waiting = Boolean(org.waiting);
      session = null;

      if (waiting) {
        // Surface the waiting state to the gate.
        throw new Error("WAITING");
      }

      return false;
    }

    if (ctx.isOwner && session?.orgKey) {
      void grantPendingMembers();
    }

    return true;
  } catch (error) {
    session = null;

    if (error instanceof Error && error.message === "WAITING") {
      throw error; // the gate renders its waiting screen
    }

    return false;
  }
}

/** Waiting screen: refetch material in case the owner's grant has landed. */
export async function retryGrant(ctx: OrgContext): Promise<UnlockResult> {
  const stored = await readStoredKeys();

  if (!stored) {
    return { error: "This device is locked." };
  }

  try {
    return await finishUnlock(
      {
        pkg: stored.pkg,
        keys: { dek: await importDek(stored.pkg.dek), priv: await importPrivateKey(stored.pkg.priv) },
      },
      stored.salt,
      stored.pub,
      (await fetchMaterial()).material,
      ctx,
    );
  } catch {
    return { error: "Still waiting for the organization key." };
  }
}

/* ----------------------------------------------------- password changes */

/**
 * Registration (step 1): keep the freshly generated package on this device
 * so step 2 and the app itself can use it without asking again.
 */
export async function persistNewAccount(
  material: Pick<AccountMaterial, "salt" | "pub" | "pkg">,
): Promise<void> {
  await storeKeys(material);
  materialCache = null;
  await deleteMeta("material");
}

/** The 24-word phrase waits on this device until step 2 stores it server-side. */
export async function stashMnemonic(mnemonic: string): Promise<void> {
  await setMeta("pending_mnemonic", mnemonic);
}

export async function takeMnemonic(): Promise<string | null> {
  return (await getMeta<string>("pending_mnemonic")) ?? null;
}

export async function clearMnemonic(): Promise<void> {
  await deleteMeta("pending_mnemonic");
}

/**
 * The recovery blob for step 2: the key package wrapped under
 * PBKDF2(mnemonic, salt) — the same package the password unwraps, so either
 * secret restores the same tasks.
 */
export async function createRecoveryBlob(mnemonic: string): Promise<string | null> {
  const stored = await readStoredKeys();

  if (!stored) {
    return null;
  }

  const kek = await deriveRecoveryKek(mnemonic, stored.salt);

  return encryptJson(kek, stored.pkg);
}

/** Re-wrap the package under a new password (salt kept — recovery depends on it). */
export async function rewrapForPassword(newPassword: string): Promise<{
  salt: string;
  wrapped: string;
} | null> {
  const current = requireKeys();

  return rewrapPackage(current.pkg, newPassword, current.salt);
}

/**
 * Apply the result of a password change that already happened server-side:
 * same package, same salt, so nothing local changes. Kept as an explicit
 * hook so future key rotations have one place to land.
 */
export function passwordChanged(): void {
  void requireKeys();
}

/** Recovery unlock used by the reset screen (returns the opened package). */
export async function openWithPhrase(
  mnemonic: string,
  material: { salt: string; wrapped: string },
): Promise<{ pkg: KeyPackage; keys: { dek: CryptoKey; priv: CryptoKey } }> {
  return openWithRecovery(mnemonic, material);
}

export { decryptJson, encryptJson, deriveKek };
