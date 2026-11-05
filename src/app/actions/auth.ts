"use server";

import { redirect } from "next/navigation";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { saveCryptoMaterial } from "@/app/actions/crypto";
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

/** What the sign-in client needs to unlock keys and pick a destination. */
export interface SignInResult {
  error: string | null;
  next: string;
  onboardingComplete: boolean;
  user: { id: string; name: string; isOwner: boolean; inOrg: boolean } | null;
}

/**
 * Sign in. Returns a status instead of redirecting: the client has to derive
 * the encryption keys from this password *before* navigating (the gate needs
 * them the moment the app mounts), so the navigation is its call to make.
 */
export async function signIn(formData: FormData): Promise<SignInResult> {
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const next = safeNext(field(formData, "next"));
  const failed = (error: string): SignInResult => ({
    error,
    next,
    onboardingComplete: false,
    user: null,
  });

  if (!email || !password) {
    return failed("Enter your email address and password.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return failed("Those credentials do not match an account.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("name, onboarding_complete, organization_id")
    .eq("id", data.user.id)
    .maybeSingle<{ name: string; onboarding_complete: boolean; organization_id: string | null }>();

  let isOwner = false;

  if (profile?.organization_id) {
    const { data: organization } = await admin
      .from("organizations")
      .select("owner_id")
      .eq("id", profile.organization_id)
      .maybeSingle<{ owner_id: string }>();

    isOwner = organization?.owner_id === data.user.id;
  }

  return {
    error: null,
    next,
    onboardingComplete: profile?.onboarding_complete ?? false,
    user: {
      id: data.user.id,
      name: profile?.name ?? "",
      isOwner,
      inOrg: Boolean(profile?.organization_id),
    },
  };
}

export interface RegisterResult {
  error: string | null;
}

const CRYPTO_LIMITS: Record<string, number> = {
  crypto_salt: 64,
  crypto_wrapped: 4096,
  crypto_pub: 128,
};

const CRYPTO_B64 = /^[A-Za-z0-9+/=_\-.]+$/;

/**
 * Create the account (step 1). The client generates the encryption keys
 * from the password it just typed and sends the *wrapped* results along —
 * this action stores them in user_metadata without ever deriving anything.
 */
export async function registerStepOne(formData: FormData): Promise<RegisterResult> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim().toLowerCase();
  const password = field(formData, "password");
  const confirm = field(formData, "password_confirm");
  const crypto: Record<string, string> = {};

  for (const key of ["crypto_salt", "crypto_wrapped", "crypto_pub"]) {
    const value = field(formData, key);

    if (!value || value.length > CRYPTO_LIMITS[key] || !CRYPTO_B64.test(value)) {
      return { error: "Encryption setup failed — reload the page and try again." };
    }

    crypto[key] = value;
  }

  if (name === "" || name.length > 60) {
    return { error: "Enter your name (max 60 characters)." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < MIN_PASSWORD) {
    return { error: "Your password must be at least 8 characters." };
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return { error: "Your password is too long (max 72 characters)." };
  }

  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  if (await findProfileByEmail(email)) {
    return { error: "That email is already registered. Try signing in instead." };
  }

  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, ...crypto },
  });

  if (error) {
    return { error: error.message };
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { error: "Your account was created. Please sign in to continue." };
  }

  return { error: null };
}

export interface CompleteRegistrationResult {
  error: string | null;
  next: string;
}

/**
 * Finish onboarding (step 2). `crypto_recovery` is the key package wrapped
 * under the recovery phrase — saved here, shown to the user on this same
 * screen before submitting.
 */
export async function completeRegistration(
  formData: FormData,
): Promise<CompleteRegistrationResult> {
  const current = await requireUser();

  if (current.profile.onboarding_complete) {
    return { error: null, next: "/" };
  }

  const type = field(formData, "account_type") === "organization" ? "organization" : "personal";
  const recovery = field(formData, "crypto_recovery").trim();

  if (recovery) {
    const saved = await saveCryptoMaterial({ recovery });

    if (saved.error) {
      return { error: saved.error, next: "" };
    }
  }

  if (type === "personal") {
    const { error } = await updateProfile(current.id, {
      onboarding_complete: true,
      organization_id: null,
    });

    if (error) {
      return { error, next: "" };
    }

    return { error: null, next: "/?notice=Welcome%20to%20Scrum Master!" };
  }

  const orgName = field(formData, "org_name").trim();

  if (orgName.length < 2 || orgName.length > 80) {
    return { error: "Enter an organization name (2–80 characters).", next: "" };
  }

  const { organization, error } = await createOrganization(orgName, current.id);

  if (!organization) {
    return { error: error ?? "Could not create that organization.", next: "" };
  }

  const { error: profileError } = await updateProfile(current.id, {
    organization_id: organization.id,
    onboarding_complete: true,
  });

  if (profileError) {
    return { error: profileError, next: "" };
  }

  return { error: null, next: "/?notice=Organization%20created." };
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
