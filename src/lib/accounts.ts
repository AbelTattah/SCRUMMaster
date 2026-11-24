/**
 * Local multi-account registry.
 *
 * Supabase holds one auth session per browser (cookies). To keep several
 * accounts on one device and switch without re-typing a password, each
 * account's session tokens and E2EE key snapshot are stored here, in this
 * origin's IndexedDB `meta` table — under separate keys so neither wipes the
 * other:
 *
 *   saved_accounts        SavedAccount[]  — identity + session tokens
 *   account_keys:<userId> AccountKeySnapshot — wrapped key package + material
 *
 * The registry survives sign-out; only the active account's data is cleared.
 * Nothing sensitive leaves the device: the server receives only the token of
 * the account being switched to, and never sees keys.
 */
import { getCurrentSessionTokens } from "@/app/actions/accounts";
import { getMeta, setMeta, deleteMeta, localdb } from "@/lib/localdb";
import { snapshotAccountKeys, type AccountKeySnapshot } from "@/lib/keys";

export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgName: string | null;
  isOwner: boolean;
  refreshToken: string;
  accessToken: string;
  savedAt: number;
}

/** The minimum identity needed to register an account. */
export interface AccountIdentity {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgName: string | null;
  isOwner: boolean;
}

const KEY = "saved_accounts";
const keysKey = (id: string) => `account_keys:${id}`;

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("data:") || value.startsWith("http") ? value : null;
}

/** All accounts saved on this device, most recently used first. */
export async function listAccounts(): Promise<SavedAccount[]> {
  const rows = (await getMeta<SavedAccount[]>(KEY)) ?? [];
  return [...rows].sort((a, b) => b.savedAt - a.savedAt);
}

/** Key snapshot for one account, stored independently of the registry. */
export async function getAccountKeys(id: string): Promise<AccountKeySnapshot | null> {
  return (await getMeta<AccountKeySnapshot>(keysKey(id))) ?? null;
}

/**
 * Register the current account with its live session and, crucially, the keys
 * that are unlocked RIGHT NOW. Call only after a successful unlock/restore —
 * otherwise the snapshot is empty and switching back leaves the account locked.
 */
export async function rememberCurrentAccount(user: AccountIdentity): Promise<void> {
  if (user.id === "guest") {
    return;
  }

  try {
    const tokens = await getCurrentSessionTokens();
    if (!tokens?.refresh_token) {
      return;
    }

    const snapshot = await snapshotAccountKeys();
    await setMeta(keysKey(user.id), snapshot);

    const rows = await listAccounts();
    const entry: SavedAccount = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: safeUrl(user.avatarUrl),
      orgName: user.orgName,
      isOwner: user.isOwner,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      savedAt: Date.now(),
    };

    await setMeta(KEY, [entry, ...rows.filter((row) => row.id !== user.id)]);
  } catch {
    // Offline / storage blocked — switching simply won't have this account.
  }
}

export async function forgetAccount(id: string): Promise<void> {
  const rows = await listAccounts();
  await setMeta(
    KEY,
    rows.filter((row) => row.id !== id),
  );
  await deleteMeta(keysKey(id));
}

export async function clearAccounts(): Promise<void> {
  const rows = await listAccounts();
  await Promise.all(rows.map((row) => deleteMeta(keysKey(row.id))));
  await deleteMeta(KEY);
}

/**
 * Clear the active account's data on sign-out while PRESERVING the saved
 * account registry and every account's key snapshot (so switching still works).
 */
export async function clearActiveAccountData(): Promise<void> {
  await Promise.all([localdb.todos.clear(), localdb.ops.clear()]);
  await Promise.all(
    ["keys", "material", "pending_recovery_codes", "pending_mnemonic", "sync_error", "material"].map(
      (key) => deleteMeta(key),
    ),
  );
}
