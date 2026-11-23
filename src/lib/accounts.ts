/**
 * Local multi-account registry.
 *
 * Supabase keeps one auth session per browser (in cookies). To let someone
 * keep several accounts on one device and switch without re-typing a password,
 * each account's refresh token and E2EE key snapshot are stored here, in this
 * origin's IndexedDB via the local `meta` table — scoped by user id.
 *
 * Nothing sensitive leaves the device: the server only receives the token of
 * the account being switched to (via the server action), and never sees keys.
 */
import { getMeta, setMeta, deleteMeta } from "@/lib/localdb";
import { snapshotAccountKeys, type AccountKeySnapshot } from "@/lib/keys";
import type { CurrentUser } from "@/lib/types";
import { createClientSupabaseClient } from "@/lib/supabase/browser";

export interface SavedAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgName: string | null;
  isOwner: boolean;
  refreshToken: string;
  accessToken: string;
  keys: AccountKeySnapshot;
  savedAt: number;
}

const KEY = "saved_accounts";

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("data:") || value.startsWith("http") ? value : null;
}

/** All accounts saved on this device, most recently used first. */
export async function listAccounts(): Promise<SavedAccount[]> {
  const rows = (await getMeta<SavedAccount[]>(KEY)) ?? [];

  return [...rows].sort((a, b) => b.savedAt - a.savedAt);
}

export async function getAccount(id: string): Promise<SavedAccount | null> {
  const rows = await listAccounts();
  return rows.find((account) => account.id === id) ?? null;
}

/**
 * Persist (or refresh) an account in the registry using the current browser
 * session and this device's active key slots. Safe to call on every sign-in.
 */
export async function rememberCurrentAccount(user: CurrentUser): Promise<void> {
  if (user.id === "guest") {
    return;
  }

  try {
    const supabase = createClientSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session?.refresh_token) {
      return;
    }

    const snapshot = await snapshotAccountKeys();
    const rows = await listAccounts();
    const entry: SavedAccount = {
      id: user.id,
      email: user.email,
      name: user.profile.name,
      avatarUrl: safeUrl(user.profile.avatar_url),
      orgName: user.organization?.name ?? null,
      isOwner: user.isOwner,
      refreshToken: session.refresh_token,
      accessToken: session.access_token,
      keys: snapshot,
      savedAt: Date.now(),
    };

    const next = [entry, ...rows.filter((row) => row.id !== user.id)];
    await setMeta(KEY, next);
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
}

export async function clearAccounts(): Promise<void> {
  await deleteMeta(KEY);
}
