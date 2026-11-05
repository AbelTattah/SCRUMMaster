"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";

function keyFrom(formData: FormData): string {
  const value = formData.get("key");

  return typeof value === "string" ? value : "";
}

export async function markRead(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const key = keyFrom(formData);

  if (key) {
    await markNotificationRead(current.profile, key);
    revalidatePath("/", "layout");
  }

  redirect("/notifications");
}

export async function markAllRead(): Promise<void> {
  const current = await requireOnboardedUser();
  const count = await markAllNotificationsRead(current.profile);

  revalidatePath("/", "layout");

  if (count === 0) {
    redirect(`/notifications?notice=${encodeURIComponent("There is nothing new to mark as read.")}`);
  }

  redirect(`/notifications?notice=${encodeURIComponent("All notifications marked as read.")}`);
}

/** Mark one notification read without navigating — used by the bell popup. */
export async function markReadInline(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const key = keyFrom(formData);

  if (key) {
    await markNotificationRead(current.profile, key);
    revalidatePath("/", "layout");
  }
}

/** Mark everything read without navigating — used by the bell popup. */
export async function markAllInline(): Promise<void> {
  const current = await requireOnboardedUser();
  await markAllNotificationsRead(current.profile);
  revalidatePath("/", "layout");
}
