"use client";

/**
 * The encryption gate. Nothing in the authenticated shell renders until the
 * device holds unlocked keys, because every list, notification and report on
 * the other side is decrypted in the browser.
 *
 * Three states:
 *   locked  — no keys on this device → password prompt (or first-time
 *             provisioning for accounts created before encryption existed)
 *   waiting — an organization member whose key grant has not arrived yet
 *   ready   — keys in hand (restored silently from this device, or freshly
 *             unlocked) → the app, with the first sync kicked off
 *
 * The screens use the standard auth chrome (AuthScreenShell) so lock,
 * set-password and waiting read as part of the sign-in experience.
 * Successful unlocks reload the page: the gate then restores the freshly
 * stored keys through the normal device path (one code path instead of two).
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { AuthScreenShell } from "@/components/AuthScreenShell";
import { AuthLoading } from "@/components/AuthLoading";
import { fetchMaterial, provisionAndUnlock, restoreFromDevice, retryGrant, unlockWithPassword } from "@/lib/keys";
import { initSync, startSync, syncNow } from "@/lib/sync";
import { signOut } from "@/app/actions/auth";

interface GateUser {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  inOrg: boolean;
  hasPassword: boolean;
}

type GateState = "loading" | "locked" | "set-password" | "waiting" | "ready";

export function CryptoGate({ user, children }: { user: GateUser; children: ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [error, setError] = useState<string | null>(null);
  const ctx = { isOwner: user.isOwner, inOrg: user.inOrg };
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    initSync({ id: user.id, name: user.name, isOwner: user.isOwner, inOrg: user.inOrg });
    startSync();

    void (async () => {
      try {
        const restored = await restoreFromDevice(ctx);

        if (restored) {
          setState("ready");
          void syncNow();
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.message === "WAITING") {
          setState("waiting");
          return;
        }
      }

      const material = await fetchMaterial();

      if (material.material?.salt) {
        setState("locked");
        return;
      }

      // No material yet: accounts that already have a password unlock through
      // the password screen (which provisions their keys from it); only
      // password-less accounts get the generated sign-in key.
      setState(
        material.material && !material.material.has_password ? "set-password" : "locked",
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.name, user.isOwner, user.inOrg]);

  if (state === "ready") {
    return <>{children}</>;
  }

  if (state === "loading") {
    return <AuthLoading active />;
  }

  if (state === "waiting") {
    return (
      <WaitingForKey
        error={error}
        onRetry={async () => {
          setError(null);
          const result = await retryGrant(ctx);

          if (result.waiting) {
            setError("Still waiting for the organization key.");
            return false;
          }

          if (result.error) {
            setError(result.error);
            return false;
          }

          setState("ready");
          void syncNow();
          return true;
        }}
      />
    );
  }

  if (state === "set-password") {
    return <FirstPassword user={user} />;
  }

  return <UnlockScreen ctx={ctx} email={user.email} initialError={error} />;
}

/* ------------------------------------------------------------- screens */

function SignOutButton() {
  return (
    <p className="auth-switch">
      <button
        className="auth-link-button"
        type="button"
        onClick={() => {
          void signOut();
        }}
      >
        Sign out and use a different account
      </button>
    </p>
  );
}

function UnlockScreen({
  ctx,
  email,
  initialError,
}: {
  ctx: { isOwner: boolean; inOrg: boolean };
  email: string;
  initialError: string | null;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!password || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const material = await fetchMaterial();
      const result = material.material?.salt
        ? await unlockWithPassword(password, ctx)
        : await provisionAndUnlock(password, ctx);

      if (result.error && !result.waiting) {
        setError(result.error);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error("sign-in key setup failed", err);
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenShell>
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to pick up where you left off.</p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              readOnly
              value={email}
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
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <AuthLoading active={busy} />

          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <SignOutButton />
      </div>
    </AuthScreenShell>
  );
}

/**
 * An account with no password yet (OAuth legacy). Instead of making the user
 * invent and confirm a password, a strong sign-in key is generated right
 * here, shown with a copy button, and installed as the account password —
 * it also becomes the key-encryption key for their task content.
 */
function FirstPassword({ user }: { user: GateUser }) {
  const [signKey, setSignKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = { isOwner: user.isOwner, inOrg: user.inOrg };

  function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

    setSignKey((hex.match(/.{4}/g) ?? []).join("-"));
    setCopied(false);
  }

  async function copy() {
    if (!signKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(signKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the field is selectable as a fallback.
    }
  }

  async function save() {
    if (!signKey || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await provisionAndUnlock(signKey, ctx);

      if (result.error && !result.waiting) {
        setError(result.error);
        return;
      }

      window.location.reload();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenShell>
      <div className="auth-card">
        <h1 className="auth-title">Your sign-in key</h1>
        <p className="auth-sub">
          This account has no password yet, so we generated a strong sign-in
          key for it. Copy it and keep it somewhere safe — you will use it
          every time you sign in.
        </p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        {signKey ? (
          <>
            <div className="key-display">
              <input
                className="input key-display-input"
                readOnly
                value={signKey}
                aria-label="Generated sign-in key"
                onFocus={(event) => event.currentTarget.select()}
              />
              <button className="btn-ghost key-copy" type="button" onClick={() => void copy()}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="field-hint key-hint">
              You can change it later in Account settings.
            </p>
          </>
        ) : null}

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {signKey ? null : (
            <button className="btn-primary" type="button" onClick={generate}>
              Generate my key
            </button>
          )}

          {signKey ? (
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save key and continue"}
            </button>
          ) : null}
        </form>

        <SignOutButton />
      </div>
    </AuthScreenShell>
  );
}

function WaitingForKey({
  onRetry,
  error,
}: {
  onRetry: () => Promise<boolean>;
  error: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(error);
  const retryRef = useRef(onRetry);
  retryRef.current = onRetry;

  // The owner grants the key from their next session — re-check on our own.
  useEffect(() => {
    const timer = window.setInterval(() => {
      void retryRef.current().catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <AuthScreenShell>
      <div className="auth-card">
        <h1 className="auth-title">Waiting for your organization</h1>
        <p className="auth-sub">
          Your organization owner has to share the organization key with you
          once — it arrives automatically the next time they open Scrum Master.
          Your tasks will appear as soon as it does.
        </p>

        {message ? (
          <p className="auth-error" role="alert">
            {message}
          </p>
        ) : null}

        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage(null);

            try {
              await onRetry();
            } catch {
              setMessage("Still waiting for the organization key.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Check again"}
          </button>
        </form>

        <SignOutButton />
      </div>
    </AuthScreenShell>
  );
}
