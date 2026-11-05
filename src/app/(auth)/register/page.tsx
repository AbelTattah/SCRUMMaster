import type { Metadata } from "next";
import Link from "next/link";

import { registerStepOne } from "@/app/actions/auth";
import { GoogleButton } from "@/components/GoogleButton";
import { requireGuest } from "@/lib/auth";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
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

      <form action={registerStepOne} className="auth-form">
        <label className="field">
          <span>Your name</span>
          <input
            className="input"
            type="text"
            name="name"
            placeholder="e.g. Abel"
            maxLength={60}
            autoComplete="name"
            required
            autoFocus
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
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
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
            minLength={8}
            required
          />
        </label>

        <button className="btn-primary" type="submit">
          Continue
        </button>
      </form>

      {/* <GoogleButton /> */}

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
