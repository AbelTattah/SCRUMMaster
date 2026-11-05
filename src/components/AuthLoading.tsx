"use client";

import { useFormStatus } from "react-dom";

/**
 * Full-screen veil shown while an auth form is working.
 *
 * Signing in or creating an account waits on Supabase and the key setup,
 * which can take a couple of seconds — long enough to read as a frozen
 * window. Inside a server-action form it reads useFormStatus; client-driven
 * forms (which call the action imperatively) pass `active` directly.
 */
export function AuthLoading({ active }: { active?: boolean } = {}) {
  const { pending } = useFormStatus();
  const show = active ?? pending;

  if (!show) {
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
