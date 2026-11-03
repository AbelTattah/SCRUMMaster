import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordReset } from "@/app/actions/auth";
import { requireGuest } from "@/lib/auth";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireGuest();
  const params = await searchParams;
  const notice = firstParam(params.notice).trim();
  const error = firstParam(params.error).trim();

  return (
    <div className="auth-card">
      <div className="auth-brand">Scrum Master</div>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-sub">We will email you a link to choose a new password.</p>

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

      <form action={requestPasswordReset} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
            autoFocus
          />
        </label>

        <button className="btn-primary" type="submit">
          Send reset link
        </button>
      </form>

      <p className="auth-switch">
        Remembered it? <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
