"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { updateNotificationPreferences } from "@/lib/data/profiles";
import { sendMail } from "@/lib/mail";
import { NOTIFICATION_LEAD_OPTIONS, NOTIFICATION_DEFAULT_LEAD } from "@/lib/notifications";

function back(key: "notice" | "error", message: string): never {
  redirect(`/settings?${key}=${encodeURIComponent(message)}`);
}

export async function saveNotificationSettings(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  const browser = formData.get("notify_browser") === "1";
  const email = formData.get("notify_email") === "1";
  const lead = Number(formData.get("notify_lead_minutes") ?? NOTIFICATION_DEFAULT_LEAD);

  const leadMinutes = (NOTIFICATION_LEAD_OPTIONS as readonly number[]).includes(lead)
    ? lead
    : NOTIFICATION_DEFAULT_LEAD;

  const { error } = await updateNotificationPreferences(current.id, {
    notify_browser: browser,
    notify_email: email,
    notify_lead_minutes: leadMinutes,
  });

  if (error) {
    back("error", error);
  }

  revalidatePath("/", "layout");
  back("notice", "Notification settings saved.");
}

export async function sendTestEmail(): Promise<void> {
  const current = await requireOnboardedUser();
  const name = current.profile.name || "there";

  const text =
    `Hello ${name},\n\n` +
    "This is a test notification from KPIMe.\n\n" +
    "Email delivery is working. Reminders, overdue tasks and tasks coming up later today will arrive here when they need your attention.\n\n" +
    "KPIMe";

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">' +
    '<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;">KPIMe</h1>' +
    `<p style="font-size:14px;line-height:1.6;">Hello ${escapeHtml(name)},</p>` +
    '<p style="font-size:14px;line-height:1.6;">This is a test notification from KPIMe.</p>' +
    '<p style="font-size:14px;line-height:1.6;">Email delivery is working. Reminders, overdue tasks and tasks coming up later today will arrive here when they need your attention.</p>' +
    "</div>";

  const result = await sendMail({
    to: current.profile.email,
    subject: "KPIMe test notification",
    text,
    html,
    userId: current.id,
  });

  if (!result.ok) {
    back("error", `Test email failed: ${result.error ?? "unknown mail error"}`);
  }

  back(
    "notice",
    `Test email sent to ${current.profile.email} (via the ${result.transport} transport).`,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
