import type { Metadata } from "next";
import { cookies } from "next/headers";

import { GuestSignInRequired } from "@/components/GuestSignInRequired";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const current = await getCurrentUser();
  const isGuest = !current && (await cookies()).get("scrum-guest")?.value === "1";

  if (isGuest) {
    return (
      <GuestSignInRequired
        title="Notifications"
        description="Sign in to receive and view notifications. In guest mode your tasks stay local on this device."
      />
    );
  }

  const { requireOnboardedUser } = await import("@/lib/auth");
  const { notificationsForUser } = await import("@/lib/data/notifications");
  const { NotificationList } = await import("@/components/NotificationList");

  const user = await requireOnboardedUser();
  const items = await notificationsForUser(user.profile);

  return <NotificationList items={items} />;
}
