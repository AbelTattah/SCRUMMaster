"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { addMemberToOrganization, removeMemberFromOrganization } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function back(key: "notice" | "error", message: string): never {
  redirect(`/team?${key}=${encodeURIComponent(message)}`);
}

async function memberInOrganization(
  memberId: string,
  organizationId: string,
): Promise<{ name: string } | null> {
  const { data } = await (await createServerSupabaseClient())
    .from("profiles")
    .select("name")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle<{ name: string }>();

  return data ?? null;
}

export async function addMember(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  if (!current.isOwner || !current.organization) {
    back("error", "Only the organization owner can add members.");
  }

  const email = field(formData, "email").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    back("error", "Enter a valid email address.");
  }

  if (email === current.email.toLowerCase()) {
    back("error", "You already own this organization.");
  }

  const result = await addMemberToOrganization(
    current.organization,
    current.profile.name,
    email,
  );

  revalidatePath("/", "layout");

  switch (result.status) {
    case "invited":
      back(
        "notice",
        `Invitation sent to ${email} — they set their password from the email.`,
      );
    case "attached":
      back(
        "notice",
        result.emailSent
          ? `${result.name} was added to the organization.`
          : `${result.name} was added, but the invite email could not be sent — ask them to use “Forgot password”.`,
      );
    case "duplicate":
      back("notice", `${result.name} is already a member of this organization.`);
    case "elsewhere":
      back("error", "That account already belongs to another organization.");
    default:
      back("error", result.message);
  }
}

export async function removeMember(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  if (!current.isOwner || !current.organization) {
    back("error", "Only the organization owner can remove members.");
  }

  const memberId = field(formData, "member_id");

  if (!isUuid(memberId)) {
    back("error", "That member no longer exists.");
  }

  if (memberId === current.id) {
    back("error", "You cannot remove yourself from your own organization.");
  }

  const member = await memberInOrganization(memberId, current.organization.id);

  if (!member) {
    back("error", "That member is no longer in this organization.");
  }

  const { error } = await removeMemberFromOrganization(memberId);

  revalidatePath("/", "layout");

  if (error) {
    back("error", error);
  }

  back("notice", `${member.name} was removed from the organization.`);
}
