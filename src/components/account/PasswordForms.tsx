"use client";

/**
 * Password section of the account screen.
 *
 * Changing the password re-wraps the same key package under the new one
 * (same salt — the recovery phrase keeps working) in the same server action
 * as the password change itself, so the two can never drift apart.
 */
import { useState, type FormEvent } from "react";

import { changePasswordWithCrypto, provisionPassword } from "@/app/actions/crypto";
import { createAccountMaterial } from "@/lib/crypto";
import { persistNewAccount, rewrapForPassword } from "@/lib/keys";

/** First password for an account that signed up without one. */
export function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const material = await createAccountMaterial(password);
      const result = await provisionPassword({
        password,
        confirm,
        salt: material.salt,
        wrapped: material.wrapped,
        pub: material.pub,
      });

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      await persistNewAccount(material);
      setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (done) {
    // Reload so the gate restores the freshly stored keys for this device.
    window.location.reload();
  }

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      <div className="form-row">
        <label className="field">
          <span>New password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
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
      </div>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn-primary btn-small" type="submit" disabled={busy}>
        {busy ? "Setting…" : "Set password"}
      </button>
    </form>
  );
}

/** Change the password of an account that already has one. */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const rewrapped = await rewrapForPassword(password);

      if (!rewrapped) {
        setError("This device is locked — unlock it first, then change your password.");
        setBusy(false);
        return;
      }

      const result = await changePasswordWithCrypto({
        current,
        next: password,
        confirm,
        salt: rewrapped.salt,
        wrapped: rewrapped.wrapped,
      });

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setDone(true);
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      <label className="field">
        <span>Current password</span>
        <input
          className="input"
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </label>

      <div className="form-row">
        <label className="field">
          <span>New password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
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
      </div>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {done ? (
        <p className="auth-note" role="status">
          Password changed — your tasks stay readable with the new one.
        </p>
      ) : null}

      <button className="btn-primary btn-small" type="submit" disabled={busy}>
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
