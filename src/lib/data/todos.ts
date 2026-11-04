import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Assignee, Counts, PageFilter, TeamTodo, Todo } from "@/lib/types";

function searchTerm(query: string): string {
  // PostgREST's ilike has no ESCAPE clause, so wildcards are removed rather
  // than allowed to match every row.
  return query.trim().replace(/[%_\\]/g, "");
}

/** A task is visible to its creator and to whoever it is assigned to. */
function visibleTo(userId: string): string {
  return `user_id.eq.${userId},assignee_id.eq.${userId}`;
}

export async function listTodos(
  userId: string,
  page: PageFilter = "home",
  query = "",
): Promise<Todo[]> {
  let request = createAdminClient()
    .from("todos")
    .select("*")
    .or(visibleTo(userId));

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
    .or(visibleTo(userId));

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
    .or(visibleTo(userId))
    .maybeSingle<Todo>();

  return data ?? null;
}

export async function createTodo(
  userId: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
  assigneeId: string | null = null,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient().from("todos").insert({
    user_id: userId,
    title,
    start_time: startTime,
    end_time: endTime,
    assignee_id: assigneeId,
  });

  return { error: error?.message ?? null };
}

/** Returns the task's new completed state, or null when it does not exist. */
export async function toggleTodo(id: string, userId: string): Promise<boolean | null> {
  const todo = await findTodo(id, userId);

  if (!todo) {
    return null;
  }

  const completed = !todo.completed;

  await createAdminClient()
    .from("todos")
    .update({
      completed,
      // Finishing a task clears its blocker — nothing is in the way anymore.
      ...(completed ? { blocker: null } : {}),
    })
    .eq("id", id)
    .or(visibleTo(userId));

  return completed;
}

export async function updateTodo(
  id: string,
  userId: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
  assigneeId: string | null = null,
): Promise<{ error: string | null }> {
  // Only the creator edits the task itself; the assignee may still toggle and
  // record blockers (see setBlocker / toggleTodo).
  const { error } = await createAdminClient()
    .from("todos")
    .update({
      title,
      start_time: startTime,
      end_time: endTime,
      assignee_id: assigneeId,
    })
    .eq("id", id)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export async function deleteTodo(id: string, userId: string): Promise<void> {
  await createAdminClient()
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

/** Record (or clear, with null) what is blocking a task. */
export async function setBlocker(
  id: string,
  userId: string,
  blocker: string | null,
): Promise<{ error: string | null }> {
  const existing = await findTodo(id, userId);

  if (!existing) {
    return { error: "That task no longer exists." };
  }

  const { error } = await createAdminClient()
    .from("todos")
    .update({ blocker })
    .eq("id", id)
    .or(visibleTo(userId));

  return { error: error?.message ?? null };
}

export async function listTeamTodos(
  organizationId: string,
  page: PageFilter = "home",
  query = "",
): Promise<{ members: Assignee[]; todos: TeamTodo[] }> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,name,avatar_url")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  const members = (profiles ?? []) as Assignee[];
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
      const assignee = todo.assignee_id ? byId.get(todo.assignee_id) : undefined;

      return {
        ...todo,
        owner_name: owner?.name ?? "",
        owner_avatar: owner?.avatar_url ?? null,
        assignee_name: assignee?.name ?? null,
        assignee_avatar: assignee?.avatar_url ?? null,
      };
    })
    .sort(
      (a, b) =>
        a.owner_name.localeCompare(b.owner_name) ||
        a.created_at.localeCompare(b.created_at),
    );

  return { members, todos };
}
