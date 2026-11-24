"use client";

/**
 * The "+" in the workspace header. Opens the account panel: the signed-in
 * account, other accounts saved on this device (switch without a password),
 * add another account (sign in — the new one is remembered automatically),
 * continue as guest, and remove saved accounts.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { signOutToAddAccount, switchAccountSession } from "@/app/actions/accounts";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { activateAccountKeys } from "@/lib/keys";
import {
  forgetAccount,
  getAccountKeys,
  listAccounts,
  rememberCurrentAccount,
  type AccountIdentity,
  type SavedAccount,
} from "@/lib/accounts";
import { clearOfflineSession } from "@/lib/offlineSession";
import type { CurrentUser } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

function safeAvatar(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("data:") || value.startsWith("http") ? value : null;
}

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
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  async function refreshAccounts() {
    // The current account is persisted by CryptoGate after its keys unlock —
    // not here, where the snapshot would be empty. Just read the registry.
    setAccounts(await listAccounts());
  }

  useEffect(() => {
    void refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isGuest]);

  useEffect(() => {
    if (open) {
      void refreshAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function placePopup() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const width = 300;
    const gap = 8;
    const margin = 12;
    // Prefer opening to the right of the button; fall back to the left.
    let left = rect.right + gap;
    if (left + width > window.innerWidth - margin) {
      left = rect.left - width - gap;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    setPosition({ top: Math.min(rect.top, window.innerHeight - 400 - margin), left });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    placePopup();

    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current && !rootRef.current.contains(target) &&
        popRef.current && !popRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function onReposition() {
      placePopup();
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchTo(account: SavedAccount) {
    setError(null);
    setOpen(false);
    setPending(true);

    void (async () => {
      try {
        // Persist the current account (with its freshly unlocked keys) before
        // replacing the active key slots and the Supabase session.
        if (!isGuest) {
          const identity: AccountIdentity = {
            id: user.id,
            email: user.email,
            name: user.profile.name,
            avatarUrl: user.profile.avatar_url,
            orgName: user.organization?.name ?? null,
            isOwner: user.isOwner,
          };
          await rememberCurrentAccount(identity);
        }

        const targetKeys = await getAccountKeys(account.id);
        if (targetKeys) {
          await activateAccountKeys(targetKeys);
        }
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
    await refreshAccounts();
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

  // Build the visible list from the registry, always including the current
  // account so the list is never empty. Fall back to the live user when the
  // registry has not been written yet.
  const displayed: SavedAccount[] = isGuest
    ? []
    : accounts.length > 0
      ? accounts
      : [
          {
            id: user.id,
            email: user.email,
            name: user.profile.name,
            avatarUrl: safeAvatar(user.profile.avatar_url),
            orgName: user.organization?.name ?? null,
            isOwner: user.isOwner,
            refreshToken: "",
            accessToken: "",
            savedAt: Date.now(),
          },
        ];

  return (
    <div className="account-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
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

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={popRef}
          className="account-pop"
          role="dialog"
          aria-label="Accounts"
          style={{ top: position.top, left: position.left }}
        >
          <div className="account-pop-head">
            <strong>Accounts</strong>
          </div>

          {isGuest ? (
            <div className="account-current">
              <span className="account-avatar-fallback"><Icon name="user" /></span>
              <span className="account-info">
                <strong>Guest</strong>
                <small>Local guest data</small>
              </span>
              <span className="account-current-tag">Current</span>
            </div>
          ) : (
            <>
              <p className="account-list-label">Saved on this device</p>
              <ul className="account-list">
                {displayed.map((account) => {
                  const isCurrent = account.id === user.id;
                  return (
                    <li
                      key={account.id}
                      className={`account-row${isCurrent ? " is-current" : ""}`}
                    >
                      <button
                        type="button"
                        className="account-select"
                        onClick={() => !isCurrent && switchTo(account)}
                        disabled={isCurrent || pending || !account.refreshToken}
                        title={isCurrent ? "This is the active account" : `Switch to ${account.name}`}
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
                        {isCurrent ? <span className="account-current-tag">Current</span> : null}
                      </button>
                      {!isCurrent && account.refreshToken ? (
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
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

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
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
