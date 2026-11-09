"use client";

/**
 * Registration step 1. The encryption keys are generated here, from the
 * password the user just typed: the wrapped results are stored with the
 * account (user_metadata) and the package is kept on this device, so step 2
 * can wrap the recovery phrase and the app opens already unlocked.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { registerStepOne } from "@/app/actions/auth";
import { AuthLoading } from "@/components/AuthLoading";
import { createAccountMaterial } from "@/lib/crypto";
import { persistNewAccount, stashMnemonic } from "@/lib/keys";

export function RegisterForm({ notice, initialError }: { notice: string; initialError: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (name.trim().length === 0 || name.trim().length > 60) {
      setError("Enter your name (max 60 characters).");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError("Your password is too long (max 72 characters).");
      return;
    }

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const material = await createAccountMaterial(password);

      const data = new FormData();
      data.set("name", name.trim());
      data.set("email", email);
      data.set("password", password);
      data.set("password_confirm", confirm);
      data.set("crypto_salt", material.salt);
      data.set("crypto_wrapped", material.wrapped);
      data.set("crypto_pub", material.pub);

      const result = await registerStepOne(data);

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      await persistNewAccount(material);
      await stashMnemonic(material.mnemonic);

      router.push("/register/type");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-sub">Step 1 of 2 — your details.</p>

      {notice ? (
        <p className="auth-note" role="status">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>Your name</span>
          <input
            className="input"
            type="text"
            name="name"
            autoComplete="name"
            required
            maxLength={60}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="field-hint">At least 8 characters.</span>
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            className="input"
            type="password"
            name="password_confirm"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>

        <AuthLoading active={busy} />

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] disabled:opacity-50"
          style={{ height: "38px", marginTop: "4px" }}
          type="submit"
          disabled={busy}
        >
          {busy ? "Creating…" : "Continue"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
