import type { Metadata } from "next";

import { NotificationList } from "@/components/NotificationList";
import { requireOnboardedUser } from "@/lib/auth";
import { notificationsForUser } from "@/lib/data/notifications";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Titles arrive as ciphertext — the list decrypts them in the browser (see
 * NotificationList). Only the fetch stays on the server.
 */
export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const items = await notificationsForUser(user.profile);

  return <NotificationList items={items} />;
}
