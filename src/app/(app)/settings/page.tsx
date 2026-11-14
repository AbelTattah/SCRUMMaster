import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { GuestSignInRequired } from "@/components/GuestSignInRequired";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  const isGuest = !current && (await cookies()).get("scrum-guest")?.value === "1";

  if (isGuest) {
    return (
      <GuestSignInRequired
        title="Settings"
        description="Sign in to manage notifications, account access, and synced settings. Guest mode keeps your tasks local on this device."
      />
    );
  }

  // Authenticated: render full settings
  const { default: SettingsFull } = await import("./SettingsFull" as any);
  return <SettingsFull searchParams={searchParams} />;
}
