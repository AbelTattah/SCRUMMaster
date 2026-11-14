import type { Metadata } from "next";
import { cookies } from "next/headers";

import { GuestSignInRequired } from "@/components/GuestSignInRequired";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  const isGuest = !current && (await cookies()).get("scrum-guest")?.value === "1";

  if (isGuest) {
    return (
      <GuestSignInRequired
        title="Team"
        description="Sign in with an organization account to manage your team. Guest mode is for personal local tasks."
      />
    );
  }

  // Authenticated: original team page logic
  const { default: TeamFull } = await import("./TeamFull" as any);
  return <TeamFull searchParams={searchParams} />;
}
