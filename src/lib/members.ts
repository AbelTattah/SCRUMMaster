import { randomBytes } from "node:crypto";

import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/env";
import { findProfileByEmail, updateProfile } from "@/lib/data/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/lib/types";

export type AttachResult =
  | { status: "invited"; name: string }
  | { status: "attached"; name: string; emailSent: boolean }
  | { status: "duplicate"; name: string }
  | { status: "elsewhere" }
  | { status: "error"; message: string };

/**
 * Attach a person to an organization by email.
 *
 * Existing accounts are moved into the organization directly. Unknown emails
 * get a brand-new account whose recovery link doubles as the "set your
 * password" invite, so the owner never has to invent a temporary password.
 */
export async function addMemberToOrganization(
  organization: Pick<Organization, "id" | "name" | "owner_id">,
  ownerName: string,
  rawEmail: string,
): Promise<AttachResult> {
  const email = rawEmail.trim().toLowerCase();
  const admin = createAdminClient();

  const existing = await findProfileByEmail(email);

  if (existing) {
    if (existing.organization_id === organization.id) {
      return { status: "duplicate", name: existing.name };
    }

    if (existing.organization_id) {
      return { status: "elsewhere" };
    }

    const { error } = await updateProfile(existing.id, {
      organization_id: organization.id,
      onboarding_complete: true,
    });

    if (error) {
      return { status: "error", message: error };
    }

    const emailSent = await sendInviteEmail({
      to: email,
      userId: existing.id,
      name: existing.name,
      organizationName: organization.name,
      ownerName,
      existingAccount: true,
    });

    return { status: "attached", name: existing.name, emailSent };
  }

  const displayName = email.split("@")[0].slice(0, 60) || "New member";
  const tempPassword = randomBytes(18).toString("base64url");

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (error || !created.user) {
    return {
      status: "error",
      message: error?.message ?? "Could not create that account.",
    };
  }

  // The auth trigger created the profile; attach it and skip the account-type
  // step — the owner already chose for them.
  const { error: attachError } = await admin
    .from("profiles")
    .update({
      organization_id: organization.id,
      onboarding_complete: true,
      invited_at: new Date().toISOString(),
    })
    .eq("id", created.user.id);

  if (attachError) {
    return { status: "error", message: attachError.message };
  }

  const emailSent = await sendInviteEmail({
    to: email,
    userId: created.user.id,
    name: displayName,
    organizationName: organization.name,
    ownerName,
    existingAccount: false,
  });

  return emailSent
    ? { status: "invited", name: displayName }
    : { status: "attached", name: displayName, emailSent: false };
}

/** Detach a member: their tasks stay theirs, assignments pointing at them go. */
export async function removeMemberFromOrganization(
  memberId: string,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  await admin.from("todos").update({ assignee_id: null }).eq("assignee_id", memberId);

  const { error } = await updateProfile(memberId, { organization_id: null });

  return { error };
}

async function sendInviteEmail(options: {
  to: string;
  userId: string;
  name: string;
  organizationName: string;
  ownerName: string;
  existingAccount: boolean;
}): Promise<boolean> {
  const resetLink = await buildRecoveryLink(options.to);

  if (!resetLink) {
    return false;
  }

  const firstName = options.name.split(" ")[0] || "there";
  const subject = `You've been added to ${options.organizationName} on Scrum Master`;
  const headline = options.existingAccount
    ? `${options.ownerName} added you to the ${options.organizationName} organization.`
    : `${options.ownerName} created your Scrum Master account in the ${options.organizationName} organization.`;

  const text =
    `Hello ${firstName},\n\n` +
    `${headline}\n\n` +
    `Open this link to set your password and join the team:\n${resetLink}\n\n` +
    "If you did not expect this, you can ignore this email.\n\nScrum Master";

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">' +
    '<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;">Scrum Master</h1>' +
    `<p style="font-size:14px;line-height:1.6;">Hello ${escapeHtml(firstName)},</p>` +
    `<p style="font-size:14px;line-height:1.6;">${escapeHtml(headline)}</p>` +
    `<p style="font-size:14px;line-height:1.6;"><a href="${resetLink}">Set your password and join</a></p>` +
    '<p style="font-size:12px;color:#727272;">If you did not expect this, you can ignore this email.</p></div>';

  const result = await sendMail({
    to: options.to,
    subject,
    text,
    html,
    userId: options.userId,
  });

  return result.ok;
}

/** A recovery link that signs the invitee straight into the password form. */
async function buildRecoveryLink(email: string): Promise<string | null> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl()}/reset-password` },
  });

  const tokenHash = data?.properties?.hashed_token;

  if (error || !tokenHash) {
    return null;
  }

  return `${siteUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=%2Freset-password`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
