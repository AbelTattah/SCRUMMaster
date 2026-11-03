import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { RegisterTypeForm } from "@/components/RegisterTypeForm";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Account type" };

export default async function RegisterTypePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();

  if (!current) {
    redirect(`/login?error=${encodeURIComponent("Sign in to finish creating your account.")}`);
  }

  if (current.profile.onboarding_complete) {
    redirect("/");
  }

  const params = await searchParams;
  const notice = firstParam(params.notice).trim();
  const error = firstParam(params.error).trim();

  return (
    <div className="auth-card">
      <div className="auth-brand">Scrum Master</div>
      <h1 className="auth-title">How will you use Scrum Master?</h1>
      <p className="auth-sub">Step 2 of 2 — choose your account type.</p>

      <ol className="steps" aria-label="Sign-up progress">
        <li className="step is-done">
          <span>&#10003;</span> Your details
        </li>
        <li className="step is-current" aria-current="step">
          <span>2</span> Account type
        </li>
      </ol>

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

      <RegisterTypeForm />

      <p className="auth-switch">
        <form action={signOut} className="auth-inline-form">
          <button type="submit" className="auth-link-button">
            Cancel and start over
          </button>
        </form>
      </p>
    </div>
  );
}
