"use client";

/**
 * Choose a new password from the emailed reset link.
 *
 * With a backup code (or legacy recovery phrase): the existing key package
 * is unwrapped and re-wrapped under the new password - tasks stay readable.
 *
 * Without it: a fresh package is installed. Old ciphertext becomes
 * permanently unreadable (the warning says so before they submit).
 */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { resetPasswordWithCrypto } from "@/app/actions/crypto";
import { AuthLoading } from "@/components/AuthLoading";
import {
  createAccountMaterial,
  isValidBackupCodeFormat,
  isValidMnemonic,
  rewrapPackage,
  type KeyPackage,
} from "@/lib/crypto";
import { fetchMaterial, openWithRecoveryCode, persistNewAccount } from "@/lib/keys";

export function ResetPasswordForm({
  notice,
  initialError,
}: {
  notice: string;
  initialError: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const hasCode = code.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Your password is too long (max 72 characters).");
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    if (hasCode && !isValidMnemonic(code) && !isValidBackupCodeFormat(code)) {
      setError("Enter a valid backup code (or a legacy 24-word recovery phrase).");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const fetched = await fetchMaterial();
      if (fetched.source === "none") {
        setError("You are offline - reconnect and try again.");
        setBusy(false);
        return;
      }

      const material = fetched.material;
      let salt: string;
      let wrapped: string;
      let pub: string | null = null;
      let store: { salt: string; pub: string; pkg: KeyPackage };

      if (hasCode && material?.salt && material.recovery) {
        try {
          const opened = await openWithRecoveryCode(code, {
            salt: material.salt,
            recovery: material.recovery,
          });
          const rewrapped = await rewrapPackage(opened.pkg, password, material.salt);
          salt = material.salt;
          wrapped = rewrapped.wrapped;
          store = { salt: material.salt, pub: material.pub ?? "", pkg: opened.pkg };
        } catch (err) {
          setError(err instanceof Error ? err.message : "That backup code does not work for this account.");
          setBusy(false);
          return;
        }
      } else {
        if (hasCode && material?.salt && !material.recovery) {
          setError("No backup codes are saved for this account. Reset without a code (existing encrypted tasks may become unreadable).");
          setBusy(false);
          return;
        }
        const fresh = await createAccountMaterial(password);
        salt = fresh.salt;
        wrapped = fresh.wrapped;
        pub = fresh.pub;
        store = { salt: fresh.salt, pub: fresh.pub, pkg: fresh.pkg };
      }

      const result = await resetPasswordWithCrypto({
        password,
        confirm,
        salt,
        wrapped,
        pub,
        recovery: null,
      });

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      await persistNewAccount(store);
      router.push("/?notice=Password%20updated.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">Scrum Master</div>
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">Set a password you will remember for next time.</p>

      {notice ? <p className="auth-note" role="status">{notice}</p> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>New password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="field-hint">At least 8 characters.</span>
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            className="input"
            type="password"
            name="password_confirm"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Backup code (optional)</span>
          <input
            className="input"
            type="text"
            name="recovery"
            placeholder="Enter one of your backup codes to keep existing tasks readable"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="field-hint">
            With a backup code, your tasks stay readable. Without it, previously encrypted tasks can no longer be opened.
          </span>
        </label>

        <AuthLoading active={busy} />

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] disabled:opacity-50"
          style={{ height: "38px", marginTop: "4px" }}
          type="submit"
          disabled={busy}
        >
          {busy ? "Saving..." : "Save password"}
        </button>
      </form>
    </div>
  );
}
