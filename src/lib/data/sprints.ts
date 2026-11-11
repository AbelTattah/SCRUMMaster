import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Sprint } from "@/lib/types";

export async function listSprints(userId: string): Promise<Sprint[]> {
  const { data } = await (await createServerSupabaseClient())
    .from("sprints")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as Sprint[];
}

export async function createSprint(
  userId: string,
  name: string,
  goal: string | null,
  startDate: string,
  endDate: string,
): Promise<Sprint | null> {
  const { data, error } = await (await createServerSupabaseClient())
    .from("sprints")
    .insert({
      user_id: userId,
      name,
      goal,
      start_date: startDate,
      end_date: endDate,
      status: "planned",
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return data as Sprint;
}

export async function updateSprintStatus(
  sprintId: string,
  status: "planned" | "active" | "completed",
): Promise<boolean> {
  const { error } = await (await createServerSupabaseClient())
    .from("sprints")
    .update({ status })
    .eq("id", sprintId);

  return !error;
}

export async function updateTodoSprint(todoId: string, sprintId: string | null): Promise<boolean> {
  const { error } = await (await createServerSupabaseClient())
    .from("todos")
    .update({ sprint_id: sprintId })
    .eq("id", todoId);

  return !error;
}
