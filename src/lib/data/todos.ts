import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Counts, PageFilter, TeamTodo, Todo } from "@/lib/types";

function searchTerm(query: string): string {
  // PostgREST's ilike has no ESCAPE clause, so wildcards are removed rather
  // than allowed to match every row.
  return query.trim().replace(/[%_\\]/g, "");
}

function applyFilter<T extends { eq: Function }>(query: T, page: PageFilter): T {
  if (page === "completed") {
    return query.eq("completed", true) as T;
  }

  if (page === "in-progress") {
    return query.eq("completed", false) as T;
  }

  return query;
}

export async function listTodos(
  userId: string,
  page: PageFilter = "home",
  query = "",
): Promise<Todo[]> {
  let request = createAdminClient()
    .from("todos")
    .select("*")
    .eq("user_id", userId);

  if (page === "completed") {
    request = request.eq("completed", true);
  } else if (page === "in-progress") {
    request = request.eq("completed", false);
  }

  const term = searchTerm(query);
  if (term !== "") {
    request = request.ilike("title", `%${term}%`);
  }

  const { data } = await request.order("created_at", { ascending: true });

  return (data ?? []) as Todo[];
}

export const countTodos = cache(async (userId: string): Promise<Counts> => {
  const { data } = await createAdminClient()
    .from("todos")
    .select("completed")
    .eq("user_id", userId);

  return (data ?? []).reduce<Counts>(
    (counts, todo) => {
      if (todo.completed) {
        counts.completed += 1;
      } else {
        counts.in_progress += 1;
      }

      return counts;
    },
    { completed: 0, in_progress: 0 },
  );
});

export async function findTodo(id: string, userId: string): Promise<Todo | null> {
  const { data } = await createAdminClient()
    .from("todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<Todo>();

  return data ?? null;
}

export async function createTodo(
  userId: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient().from("todos").insert({
    user_id: userId,
    title,
    start_time: startTime,
    end_time: endTime,
  });

  return { error: error?.message ?? null };
}

export async function toggleTodo(id: string, userId: string): Promise<void> {
  const todo = await findTodo(id, userId);

  if (!todo) {
    return;
  }

  await createAdminClient()
    .from("todos")
    .update({ completed: !todo.completed })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function updateTodo(
  id: string,
  userId: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient()
    .from("todos")
    .update({ title, start_time: startTime, end_time: endTime })
    .eq("id", id)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export async function deleteTodo(id: string, userId: string): Promise<void> {
  await createAdminClient().from("todos").delete().eq("id", id).eq("user_id", userId);
}

export async function listTeamTodos(
  organizationId: string,
  page: PageFilter = "home",
  query = "",
): Promise<{ members: { id: string; name: string; avatar_url: string | null }[]; todos: TeamTodo[] }> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,name,avatar_url")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  const members = (profiles ?? []) as { id: string; name: string; avatar_url: string | null }[];
  const ids = members.map((member) => member.id);

  if (ids.length === 0) {
    return { members, todos: [] };
  }

  let request = admin.from("todos").select("*").in("user_id", ids);

  if (page === "completed") {
    request = request.eq("completed", true);
  } else if (page === "in-progress") {
    request = request.eq("completed", false);
  }

  const term = searchTerm(query);
  if (term !== "") {
    request = request.ilike("title", `%${term}%`);
  }

  const { data } = await request.order("created_at", { ascending: true });

  const byId = new Map(members.map((member) => [member.id, member]));

  const todos = ((data ?? []) as Todo[])
    .map((todo) => {
      const owner = byId.get(todo.user_id);

      return {
        ...todo,
        owner_name: owner?.name ?? "",
        owner_avatar: owner?.avatar_url ?? null,
      };
    })
    .sort(
      (a, b) =>
        a.owner_name.localeCompare(b.owner_name) ||
        a.created_at.localeCompare(b.created_at),
    );

  return { members, todos };
}
