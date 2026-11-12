import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DailyScrumEntry, SprintReview } from "@/lib/types";

export async function listSprintReviews(sprintId: string): Promise<SprintReview[]> {
  const { data } = await (await createServerSupabaseClient())
    .from("sprint_reviews")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: false });

  return (data ?? []) as SprintReview[];
}

export async function saveSprintReview(
  sprintId: string,
  userId: string,
  wentWell: string | null,
  toImprove: string | null,
  actionItems: string | null,
): Promise<boolean> {
  const { error } = await (await createServerSupabaseClient())
    .from("sprint_reviews")
    .insert({
      sprint_id: sprintId,
      user_id: userId,
      went_well: wentWell,
      to_improve: toImprove,
      action_items: actionItems,
    });

  return !error;
}

export async function listDailyScrum(sprintId: string): Promise<DailyScrumEntry[]> {
  const { data } = await (await createServerSupabaseClient())
    .from("daily_scrum")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: false });

  return (data ?? []) as DailyScrumEntry[];
}

export async function saveDailyScrum(
  sprintId: string,
  userId: string,
  yesterday: string | null,
  today: string | null,
  blockers: string | null,
): Promise<boolean> {
  const { error } = await (await createServerSupabaseClient())
    .from("daily_scrum")
    .insert({
      sprint_id: sprintId,
      user_id: userId,
      yesterday,
      today,
      blockers,
    });

  return !error;
}
