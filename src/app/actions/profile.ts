"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findProfileByEmail,
  setOrganization,
  updateProfile,
} from "@/lib/data/profiles";
import { createOrganization } from "@/lib/data/organizations";
import { isUuid } from "@/lib/utils";

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function back(path: string, key: "notice" | "error", message: string): never {
  const separator = path.includes("?") ? "&" : "?";

  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 190;
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim().toLowerCase();

  if (name === "" || name.length > 60) {
    back("/account", "error", "Please enter your name (max 60 characters).");
  }

  if (!isValidEmail(email)) {
    back("/account", "error", "Please enter a valid email address.");
  }

  const existing = await findProfileByEmail(email);

  if (existing && existing.id !== current.id) {
    back("/account", "error", "That email is already registered to another account.");
  }

  if (email !== current.profile.email.toLowerCase()) {
    const { error } = await createAdminClient().auth.admin.updateUserById(current.id, {
      email,
      email_confirm: true,
    });

    if (error) {
      back("/account", "error", error.message);
    }
  }

  const { error } = await updateProfile(current.id, { name, email });

  if (error) {
    back("/account", "error", error);
  }

  revalidatePath("/", "layout");
  back("/account", "notice", "Profile updated.");
}

export async function updateAvatar(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    back("/account", "error", "No file received.");
  }

  const extension = AVATAR_TYPES[file.type];

  if (!extension) {
    back("/account", "error", "Choose a JPEG, PNG, WebP or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    back("/account", "error", "That image is larger than 3 MB.");
  }

  const admin = createAdminClient();
  const path = `${current.id}/${Date.now()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("avatars").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    back("/account", "error", `Could not upload that image: ${uploadError.message}`);
  }

  const { data } = admin.storage.from("avatars").getPublicUrl(path);

  const { error } = await updateProfile(current.id, { avatar_url: data.publicUrl });

  if (error) {
    back("/account", "error", error);
  }

  // Best-effort cleanup of the previous upload (the default avatar is not ours).
  const previous = current.profile.avatar_url;
  const marker = "/storage/v1/object/public/avatars/";

  if (previous?.includes(marker)) {
    const oldPath = previous.slice(previous.indexOf(marker) + marker.length);

    if (oldPath && oldPath !== path) {
      await admin.storage
        .from("avatars")
        .remove([decodeURIComponent(oldPath)])
        .catch(() => undefined);
    }
  }

  revalidatePath("/", "layout");
  back("/account", "notice", "Profile picture updated.");
}

export async function createOrganizationAction(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  if (current.organization) {
    back("/account?tab=organization", "error", "You already belong to an organization.");
  }

  const name = field(formData, "org_name").trim();

  if (name.length < 2 || name.length > 80) {
    back("/account", "error", "Please enter an organization name (2–80 characters).");
  }

  const { organization, error } = await createOrganization(name, current.id);

  if (!organization) {
    back("/account", "error", error ?? "Could not create that organization.");
  }

  const { error: profileError } = await setOrganization(current.id, organization.id);

  if (profileError) {
    back("/account", "error", profileError);
  }

  revalidatePath("/", "layout");
  back(
    "/account?tab=organization",
    "notice",
    "Organization created. This account is now the organization account.",
  );
}

export async function associateMember(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  if (!current.organization || !current.isOwner) {
    back("/account?tab=organization", "error", "Only the organization account can manage members.");
  }

  const email = field(formData, "email").trim().toLowerCase();

  if (!isValidEmail(email)) {
    back("/account?tab=organization", "error", "Please enter a valid email address.");
  }

  const member = await findProfileByEmail(email);

  if (!member) {
    back(
      "/account?tab=organization",
      "error",
      "No account uses that email yet. Ask them to sign up first, then add them.",
    );
  }

  if (member.id === current.id) {
    back("/account?tab=organization", "error", "That is your own account.");
  }

  if (member.organization_id === current.organization.id) {
    back("/account?tab=organization", "error", `${member.name} is already in your organization.`);
  }

  if (member.organization_id) {
    back(
      "/account?tab=organization",
      "error",
      `${member.name} already belongs to another organization.`,
    );
  }

  const { error } = await setOrganization(member.id, current.organization.id);

  if (error) {
    back("/account?tab=organization", "error", error);
  }

  revalidatePath("/", "layout");
  back(
    "/account?tab=organization",
    "notice",
    `${member.name} was added to ${current.organization.name}.`,
  );
}

export async function removeMember(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  if (!current.organization || !current.isOwner) {
    back("/account?tab=organization", "error", "Only the organization account can manage members.");
  }

  const memberId = field(formData, "user_id");

  if (!isUuid(memberId)) {
    back("/account?tab=organization", "error", "That account is not a member of your organization.");
  }

  if (memberId === current.id) {
    back("/account?tab=organization", "error", "You cannot remove your own account.");
  }

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("id,name,organization_id")
    .eq("id", memberId)
    .maybeSingle<{ id: string; name: string; organization_id: string | null }>();

  if (!profile || profile.organization_id !== current.organization.id) {
    back("/account?tab=organization", "error", "That account is not a member of your organization.");
  }

  const { error } = await setOrganization(profile.id, null);

  if (error) {
    back("/account?tab=organization", "error", error);
  }

  revalidatePath("/", "layout");
  back(
    "/account?tab=organization",
    "notice",
    `${profile.name} was removed from ${current.organization.name}.`,
  );
}

export async function leaveOrganization(): Promise<void> {
  const current = await requireOnboardedUser();

  if (!current.organization) {
    back("/account?tab=organization", "error", "You are not part of an organization.");
  }

  if (current.isOwner) {
    back(
      "/account?tab=organization",
      "error",
      "The organization account cannot leave its own organization.",
    );
  }

  const { error } = await setOrganization(current.id, null);

  if (error) {
    back("/account?tab=organization", "error", error);
  }

  revalidatePath("/", "layout");
  back("/account?tab=organization", "notice", `You left ${current.organization.name}.`);
}
