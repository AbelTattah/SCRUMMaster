"use server";

import { redirect } from "next/navigation";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findProfileByEmail, updateProfile } from "@/lib/data/profiles";
import { createOrganization } from "@/lib/data/organizations";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/utils";

const MIN_PASSWORD = 8;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function back(path: string, key: "notice" | "error", message: string): never {
  const separator = path.includes("?") ? "&" : "?";

  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const next = safeNext(field(formData, "next"));

  if (!email || !password) {
    back("/login", "error", "Enter your email address and password.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    back("/login", "error", "Those credentials do not match an account.");
  }

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", data.user.id)
    .maybeSingle<{ onboarding_complete: boolean }>();

  redirect(profile?.onboarding_complete ? next : "/register/type");
}

export async function registerStepOne(formData: FormData): Promise<void> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const confirm = field(formData, "password_confirm");

  if (name === "" || name.length > 60) {
    back("/register", "error", "Enter your name (max 60 characters).");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    back("/register", "error", "Enter a valid email address.");
  }

  if (password.length < MIN_PASSWORD) {
    back("/register", "error", "Your password must be at least 8 characters.");
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    back("/register", "error", "Your password is too long (max 72 characters).");
  }

  if (password !== confirm) {
    back("/register", "error", "The two passwords do not match.");
  }

  if (await findProfileByEmail(email)) {
    back("/register", "error", "That email is already registered. Try signing in instead.");
  }

  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    back("/register", "error", error.message);
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    back("/login", "error", "Your account was created. Please sign in to continue.");
  }

  redirect("/register/type");
}

export async function completeRegistration(formData: FormData): Promise<void> {
  const current = await requireUser();

  if (current.profile.onboarding_complete) {
    redirect("/");
  }

  const type = field(formData, "account_type") === "organization" ? "organization" : "personal";

  if (type === "personal") {
    const { error } = await updateProfile(current.id, {
      onboarding_complete: true,
      organization_id: null,
    });

    if (error) {
      back("/register/type", "error", error);
    }

    redirect("/?notice=Welcome%20to%20Scrum Master!");
  }

  const orgName = field(formData, "org_name").trim();

  if (orgName.length < 2 || orgName.length > 80) {
    back("/register/type", "error", "Enter an organization name (2–80 characters).");
  }

  const { organization, error } = await createOrganization(orgName, current.id);

  if (!organization) {
    back("/register/type", "error", error ?? "Could not create that organization.");
  }

  const { error: profileError } = await updateProfile(current.id, {
    organization_id: organization.id,
    onboarding_complete: true,
  });

  if (profileError) {
    back("/register/type", "error", profileError);
  }

  redirect("/?notice=Organization%20created.");
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = field(formData, "email").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    back("/forgot-password", "error", "Enter a valid email address.");
  }

  const profile = await findProfileByEmail(email);

  if (profile) {
    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl()}/reset-password` },
    });

    const tokenHash = data?.properties?.hashed_token;

    if (!error && tokenHash) {
      const link = `${siteUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=%2Freset-password`;
      const result = await sendMail({
        to: email,
        subject: "Reset your Scrum Master password",
        text:
          `Hello ${profile.name},\n\n` +
          "We received a request to reset your Scrum Master password.\n\n" +
          `Open this link to choose a new password:\n${link}\n\n` +
          "If you did not ask for this, you can ignore the email.\n\nScrum Master",
        html:
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;max-width:560px;margin:0 auto;padding:24px;">' +
          '<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;">Scrum Master</h1>' +
          `<p style="font-size:14px;line-height:1.6;">Hello ${escapeHtml(profile.name)},</p>` +
          '<p style="font-size:14px;line-height:1.6;">We received a request to reset your Scrum Master password.</p>' +
          `<p style="font-size:14px;line-height:1.6;"><a href="${link}">Choose a new password</a></p>` +
          '<p style="font-size:12px;color:#727272;">If you did not ask for this, you can ignore the email.</p></div>',
        userId: profile.id,
      });

      if (!result.ok) {
        back("/forgot-password", "error", `The email could not be sent: ${result.error}`);
      }
    }
  }

  back(
    "/forgot-password",
    "notice",
    "If that email has an account, a reset link is on its way.",
  );
}

export async function updatePassword(formData: FormData): Promise<void> {
  const current = await requireUser();
  const password = field(formData, "password");
  const confirm = field(formData, "password_confirm");

  if (password.length < MIN_PASSWORD) {
    back("/reset-password", "error", "Your new password must be at least 8 characters.");
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    back("/reset-password", "error", "Your new password is too long (max 72 characters).");
  }

  if (password !== confirm) {
    back("/reset-password", "error", "The two new passwords do not match.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    back("/reset-password", "error", error.message);
  }

  redirect(`/?notice=${encodeURIComponent("Password updated — you can use it to sign in.")}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  redirect("/login?notice=You%20have%20been%20signed%20out.");
}

export async function cancelOnboarding(): Promise<void> {
  const current = await getCurrentUser();

  if (current && !current.profile.onboarding_complete) {
    await createAdminClient().auth.admin.deleteUser(current.id).catch(() => undefined);
  }

  redirect("/register");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
