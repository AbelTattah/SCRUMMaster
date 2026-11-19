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
import { Icon } from "@/components/icons";
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
        // The gate retries with this password once if device restore fails.
      }

      // Hand the password to the app shell for a one-shot transparent unlock.
      // It is consumed and removed on first use; no second prompt is shown.
      try {
        sessionStorage.setItem("scrum-master.pending-unlock", password);
      } catch {
        // ignore
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
        <img src="/favicon.png" alt="Scrum Master" />
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

      <div className="auth-divider"><span>or</span></div>

      <div className="auth-alt-actions">
        <a className="auth-provider" href="/auth/google">
          <span className="provider-left">
            <span className="provider-avatar"><Icon name="user" /></span>
            <span className="provider-copy">
              <strong>Continue with Google</strong>
              <small>Use your Google account</small>
            </span>
          </span>
          <svg className="provider-g" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
          </svg>
        </a>

        <a className="auth-sso" href="/guest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M17.5 19H9a7 7 0 0 1-6.7-9 7.5 7.5 0 0 1 14.4 2" />
            <path d="M7 19h10a4 4 0 0 0 .8-7.9" />
          </svg>
          Continue as guest
        </a>
      </div>

      <p className="auth-help">Need help?</p>
    </div>
  );
}
