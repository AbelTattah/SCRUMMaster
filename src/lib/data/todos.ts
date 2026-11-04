import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Assignee,
  Counts,
  CurrentUser,
  PageFilter,
  TeamTodo,
  Todo,
} from "@/lib/types";

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

export type TodoRole = "creator" | "assignee" | "owner";

export interface ManagedTodo {
  todo: Todo;
  role: TodoRole;
}

/**
 * Load a task for a mutating action.
 *
 * The creator and the assignee manage their own work; on top of that the
 * owner of the creator's organization manages *every* task inside it. That
 * last rule is what lets an organization add a person by email and assign,
 * update, block and complete tasks for them before that person has ever
 * signed in.
 */
export async function findManagedTodo(
  id: string,
  current: Pick<CurrentUser, "id" | "isOwner" | "organization">,
): Promise<ManagedTodo | null> {
  const { data } = await createAdminClient()
    .from("todos")
    .select("*")
    .eq("id", id)
    .maybeSingle<Todo>();

  if (!data) {
    return null;
  }

  if (data.user_id === current.id) {
    return { todo: data, role: "creator" };
  }

  if (data.assignee_id === current.id) {
    return { todo: data, role: "assignee" };
  }

  if (current.isOwner && current.organization) {
    const { data: member } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("id", data.user_id)
      .eq("organization_id", current.organization.id)
      .maybeSingle<{ id: string }>();

    if (member) {
      return { todo: data, role: "owner" };
    }
  }

  return null;
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

/**
 * Toggle completion. Returns the task's new state — including whose work it
 * is — so the caller can award XP to the right person, or null when the task
 * no longer exists. Callers authorise first (findManagedTodo).
 */
export async function toggleTodo(
  id: string,
): Promise<{ completed: boolean; assignee_id: string | null; user_id: string } | null> {
  const { data: todo } = await createAdminClient()
    .from("todos")
    .select("id,completed,assignee_id,user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; completed: boolean; assignee_id: string | null; user_id: string }>();

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
    .eq("id", id);

  return { completed, assignee_id: todo.assignee_id, user_id: todo.user_id };
}

export async function updateTodo(
  id: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
  assigneeId: string | null = null,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient()
    .from("todos")
    .update({
      title,
      start_time: startTime,
      end_time: endTime,
      assignee_id: assigneeId,
    })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function deleteTodo(id: string): Promise<void> {
  await createAdminClient().from("todos").delete().eq("id", id);
}

/** Record (or clear, with null) what is blocking a task. */
export async function setBlocker(
  id: string,
  blocker: string | null,
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient()
    .from("todos")
    .update({ blocker })
    .eq("id", id);

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
