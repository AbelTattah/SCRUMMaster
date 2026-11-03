import type { Metadata } from "next";
import Link from "next/link";

import { signIn } from "@/app/actions/auth";
import { GoogleButton } from "@/components/GoogleButton";
import { requireGuest } from "@/lib/auth";
import { firstParam, safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireGuest();
  const params = await searchParams;
  const notice = firstParam(params.notice).trim();
  const error = firstParam(params.error).trim();
  const next = safeNext(firstParam(params.next));

  return (
    <div className="auth-card">
      <div className="auth-brand">Scrum Master</div>
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

      <form action={signIn} className="auth-form">
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
          />
        </label>

        <button className="btn-primary" type="submit">
          Sign in
        </button>
      </form>

      <GoogleButton />

      <p className="auth-switch">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>

      <p className="auth-switch">
        New to Scrum Master? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
