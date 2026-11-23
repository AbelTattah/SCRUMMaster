"use client";

/**
 * The "+" in the workspace header. Opens the account panel: the signed-in
 * account, other accounts saved on this device (switch without a password),
 * add another account (sign in — the new one is remembered automatically),
 * continue as guest, and remove saved accounts.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOutToAddAccount, switchAccountSession } from "@/app/actions/accounts";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { activateAccountKeys } from "@/lib/keys";
import { forgetAccount, listAccounts, rememberCurrentAccount, type SavedAccount } from "@/lib/accounts";
import { clearOfflineSession } from "@/lib/offlineSession";
import type { CurrentUser } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

export function AccountSwitcher({
  user,
  isGuest,
}: {
  user: CurrentUser;
  isGuest?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGuest && user.id) {
      void rememberCurrentAccount(user);
    }
    void listAccounts().then(setAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isGuest]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchTo(account: SavedAccount) {
    setError(null);
    setOpen(false);
    setPending(true);

    void (async () => {
      try {
        await activateAccountKeys(account.keys);
        clearOfflineSession();

        const data = new FormData();
        data.set("user_id", account.id);
        data.set("access_token", account.accessToken);
        data.set("refresh_token", account.refreshToken);

        const result = await switchAccountSession(data);

        if (result.error) {
          setError(result.error);
          setPending(false);
          return;
        }

        window.location.href = "/";
      } catch {
        setError("Could not switch account. Try again.");
        setPending(false);
      }
    })();
  }

  async function remove(id: string) {
    await forgetAccount(id);
    setAccounts(await listAccounts());
  }

  function addAccount() {
    setOpen(false);
    clearOfflineSession();
    void signOutToAddAccount();
  }

  function continueAsGuest() {
    setOpen(false);
    clearOfflineSession();
    if (isGuest) {
      window.location.href = "/";
      return;
    }
    void signOutToAddAccount();
  }

  const currentName = isGuest ? "Guest" : user.profile.name;
  const currentAvatar = isGuest ? null : avatarUrl(user.profile.avatar_url, user.profile.name, user.profile.id);
  const others = accounts.filter((account) => !isGuest && account.id !== user.id);

  return (
    <div className="account-switcher" ref={rootRef}>
      <button
        type="button"
        className="workspace-add"
        aria-label="Switch or add account"
        title="Switch or add account"
        aria-expanded={open}
        onClick={() => {
          setError(null);
          setOpen((value) => !value);
        }}
      >
        <Icon name="plus" />
      </button>

      {open ? (
        <div className="account-pop" role="dialog" aria-label="Accounts">
          <div className="account-pop-head">
            <strong>Accounts</strong>
          </div>

          <div className="account-current">
            {currentAvatar ? <img src={currentAvatar} alt="" /> : <span className="account-avatar-fallback"><Icon name="user" /></span>}
            <span className="account-info">
              <strong>{currentName}</strong>
              <small>{isGuest ? "Local guest data" : user.email}</small>
            </span>
            <span className="account-current-tag">Current</span>
          </div>

          {others.length > 0 ? (
            <ul className="account-list">
              {others.map((account) => (
                <li key={account.id} className="account-row">
                  <button
                    type="button"
                    className="account-select"
                    onClick={() => switchTo(account)}
                    disabled={pending}
                  >
                    {account.avatarUrl ? (
                      <img src={account.avatarUrl} alt="" />
                    ) : (
                      <span className="account-avatar-fallback"><Icon name="user" /></span>
                    )}
                    <span className="account-info">
                      <strong>{account.name}</strong>
                      <small>{account.email}</small>
                    </span>
                  </button>
                  <ConfirmForm
                    action={() => remove(account.id)}
                    className="account-remove-form"
                    confirmTitle="Remove account?"
                    confirmMessage={`Remove ${account.name} from this device? Their local copy can be added again by signing in.`}
                    confirmLabel="Remove"
                  >
                    <button type="submit" className="account-remove" aria-label={`Remove ${account.name}`} title="Remove from this device">
                      ×
                    </button>
                  </ConfirmForm>
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="account-error" role="alert">{error}</p> : null}

          <div className="account-pop-actions">
            {!isGuest ? (
              <button type="button" className="account-action" onClick={addAccount}>
                <Icon name="plus" /> Add another account
              </button>
            ) : (
              <Link href="/login" className="account-action">
                <Icon name="plus" /> Sign in
              </Link>
            )}
            <button type="button" className="account-action" onClick={continueAsGuest}>
              <Icon name="user" /> Continue as guest
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
