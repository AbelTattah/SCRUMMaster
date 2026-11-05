import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
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

  return <ResetPasswordForm notice={notice} initialError={error} />;
}
