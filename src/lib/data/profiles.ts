import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Member, Profile, ScrumRole } from "@/lib/types";

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const { data } = await (await createServerSupabaseClient())
    .from("profiles")
    .select("*")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle<Profile>();

  return data ?? null;
}

export async function updateProfile(
  id: string,
  values: Partial<Pick<Profile, "name" | "email" | "avatar_url" | "organization_id" | "onboarding_complete">>,
): Promise<{ error: string | null }> {
  const { error } = await (await createServerSupabaseClient()).from("profiles").update(values).eq("id", id);

  return { error: error?.message ?? null };
}

export async function updateNotificationPreferences(
  id: string,
  values: Pick<Profile, "notify_browser" | "notify_email" | "notify_lead_minutes">,
): Promise<{ error: string | null }> {
  const { error } = await (await createServerSupabaseClient()).from("profiles").update(values).eq("id", id);

  return { error: error?.message ?? null };
}

export async function setOrganization(
  id: string,
  organizationId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await (await createServerSupabaseClient())
    .from("profiles")
    .update({ organization_id: organizationId })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function listMembers(organizationId: string, ownerId: string): Promise<Member[]> {
  const admin = await createServerSupabaseClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,name,email,avatar_url,xp,invited_at,scrum_role")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (!profiles || profiles.length === 0) {
    return [];
  }

  const ids = profiles.map((profile) => profile.id as string);

  const { data: todos } = await admin
    .from("todos")
    .select("user_id,completed")
    .in("user_id", ids);

  const counts = new Map<string, { total: number; completed: number }>();

  for (const todo of todos ?? []) {
    const id = todo.user_id as string;
    const entry = counts.get(id) ?? { total: 0, completed: 0 };

    entry.total += 1;
    if (todo.completed) {
      entry.completed += 1;
    }
    counts.set(id, entry);
  }

  return profiles
    .map((profile) => {
      const entry = counts.get(profile.id as string) ?? { total: 0, completed: 0 };

      return {
        id: profile.id as string,
        name: profile.name as string,
        email: profile.email as string,
        avatar_url: (profile.avatar_url as string | null) ?? null,
        is_owner: profile.id === ownerId,
        scrum_role: (profile.scrum_role as ScrumRole | null) ?? null,
        todo_count: entry.total,
        completed_count: entry.completed,
        xp: Number(profile.xp ?? 0),
        invited_at: (profile.invited_at as string | null) ?? null,
      };
    })
    .sort((a, b) => Number(b.is_owner) - Number(a.is_owner) || a.name.localeCompare(b.name));
}

export async function notificationRecipients(): Promise<Profile[]> {
  const { data } = await (await createServerSupabaseClient())
    .from("profiles")
    .select("*")
    .eq("notify_email", true)
    .order("created_at", { ascending: true });

  return (data ?? []) as Profile[];
}
