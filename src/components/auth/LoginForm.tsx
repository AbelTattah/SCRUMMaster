"use client";

/**
 * Sign-in form. The password stays in this component just long enough to
 * derive and store the encryption keys locally — after the navigation the
 * gate restores them from the device, so the app opens already unlocked.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signIn } from "@/app/actions/auth";
import { AuthLoading } from "@/components/AuthLoading";
import { fetchMaterial, provisionAndUnlock, unlockWithPassword } from "@/lib/keys";

export function LoginForm({
  next,
  notice,
  initialError,
}: {
  next: string;
  notice: string;
  initialError: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = new FormData();
      data.set("email", email);
      data.set("password", password);
      data.set("next", next);

      const result = await signIn(data);

      if (result.error || !result.user) {
        setError(result.error ?? "Could not sign in. Try again.");
        setBusy(false);
        return;
      }

      const ctx = { isOwner: result.user.isOwner, inOrg: result.user.inOrg };

      try {
        const material = await fetchMaterial();

        if (material.material?.salt) {
          await unlockWithPassword(password, ctx);
        } else {
          // Account from before encryption existed: keys are built from
          // this password now (their old plaintext todos keep working).
          await provisionAndUnlock(password, ctx);
        }
      } catch {
        // Key problems surface on the gate after navigation instead.
      }

      router.push(result.onboardingComplete ? result.next : "/register/type");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to pick up where you left off.</p>

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
        <input type="hidden" name="next" value={next} />

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
            autoFocus
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <AuthLoading active={busy} />

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-[#21005D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2E0480] disabled:opacity-50"
          style={{ height: "38px", marginTop: "4px" }}
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>

      <p className="auth-switch">
        New to Scrum Master? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
