import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { updatePassword } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();

  if (!current) {
    redirect(
      `/login?error=${encodeURIComponent("Open the reset link from your email to continue.")}`,
    );
  }

  const params = await searchParams;
  const notice = firstParam(params.notice).trim();
  const error = firstParam(params.error).trim();

  return (
    <div className="auth-card">
      <div className="auth-brand">KPIMe</div>
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">Set a password you will remember for next time.</p>

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

      <form action={updatePassword} className="auth-form">
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
          />
        </label>

        <button className="btn-primary" type="submit">
          Save password
        </button>
      </form>
    </div>
  );
}
