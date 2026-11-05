import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/RegisterForm";
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

  return <RegisterForm notice={notice} initialError={error} />;
}
