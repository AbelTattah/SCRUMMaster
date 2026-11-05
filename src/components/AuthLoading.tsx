"use client";

import { useFormStatus } from "react-dom";

/**
 * Full-screen veil shown while an auth form's server action runs.
 *
 * Signing in or creating an account waits on Supabase and a redirect, which
 * can take a couple of seconds — long enough to read as a frozen window. This
 * renders inside the <form>, so the moment the user submits it covers the
 * screen with the app mark and a glowing indeterminate bar, and it disappears
 * on its own when the navigation lands.
 */
export function AuthLoading() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <img className="auth-loading__mark" src="/favicon.png" alt="" />
      <div className="auth-loading__bar" aria-hidden="true">
        <span />
      </div>
      <span className="auth-loading__sr">Signing you in…</span>
    </div>
  );
}
