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
import { GoogleButton } from "@/components/GoogleButton";
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="auth-card auth-card--modern">
      <div className="auth-mark">
        <img src="/logo.png" alt="Scrum Master" />
      </div>

      <h1 className="auth-title">Welcome back!</h1>
      <p className="auth-sub auth-sub--signup">
        Don&rsquo;t have an account? <Link href="/register">Sign up</Link>
      </p>

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

      <div className="auth-alt-actions">
        <GoogleButton />

        <a className="auth-sso" href="/guest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M17.5 19H9a7 7 0 0 1-6.7-9 7.5 7.5 0 0 1 14.4 2" />
            <path d="M7 19h10a4 4 0 0 0 .8-7.9" />
          </svg>
          Continue as guest
        </a>
      </div>

      <div className="auth-divider"><span>or</span></div>

      <form className="auth-form" onSubmit={submit}>
        <input type="hidden" name="next" value={next} />

        <label className="field">
          <span>Work email</span>
          <input
            className="input"
            type="email"
            name="email"
            placeholder="Work email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field auth-password-field">
          <span>Password</span>
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="auth-eye"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </label>

        <AuthLoading active={busy} />

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="auth-switch auth-switch--forgot">
        <Link href="/forgot-password">Forgot Password?</Link>
      </p>

      <p className="auth-help">Need help?</p>
    </div>
  );
}
