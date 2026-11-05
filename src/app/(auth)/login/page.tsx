import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
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

  return <LoginForm next={next} notice={notice} initialError={error} />;
}
