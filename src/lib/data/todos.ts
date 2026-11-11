import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  let request = (await createServerSupabaseClient())
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
  const { data } = await (await createServerSupabaseClient())
    .from("todos")
    .select("completed,start_time,end_time")
    .or(visibleTo(userId));

  return (data ?? []).reduce<Counts>(
    (counts, todo) => {
      if (todo.completed) {
        counts.completed += 1;
      } else if (todo.start_time || todo.end_time) {
        // "In progress" = scheduled work that is not finished; unscheduled
        // captures are backlog drafts and are not counted here.
        counts.in_progress += 1;
      }

      return counts;
    },
    { completed: 0, in_progress: 0 },
  );
});


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
  const { data } = await (await createServerSupabaseClient())
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
    const { data: member } = await (await createServerSupabaseClient())
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


/** How many todos this user *created* since a point in time (nudge logic). */
export async function countTodosCreatedSince(userId: string, since: Date): Promise<number> {
  const { count } = await (await createServerSupabaseClient())
    .from("todos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  return count ?? 0;
}

/**
 * Toggle completion. Returns the task's new state — including whose work it
 * is — so the caller can award XP to the right person, or null when the task
 * no longer exists. Callers authorise first (findManagedTodo).
 */


export async function deleteTodo(id: string): Promise<void> {
  (await createServerSupabaseClient()).from("todos").delete().eq("id", id);
}

/** Record (or clear, with null) what is blocking a task. */

export async function listTeamTodos(
  organizationId: string,
  page: PageFilter = "home",
  query = "",
): Promise<{ members: Assignee[]; todos: TeamTodo[] }> {  const admin = await createServerSupabaseClient();

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

/* ------------------------------------------------------------------ sync */

/** The full state a sync push carries for one todo. */
export interface TodoState {
  title: string;
  start_time: string | null;
  end_time: string | null;
  assignee_id: string | null;
  blocker: string | null;
  completed: boolean;
  sprint_id: string | null;
}

/**
 * Insert a todo with a client-generated id (offline-first create: the row
 * exists locally before the server ever hears about it).
 */
export async function insertTodoWithId(
  userId: string,
  id: string,
  state: TodoState,
): Promise<{ error: string | null }> {
  const { error } = await (await createServerSupabaseClient())
    .from("todos")
    .insert({
      id,
      user_id: userId,
      title: state.title,
      start_time: state.start_time,
      end_time: state.end_time,
      assignee_id: state.assignee_id,
      blocker: state.blocker,
      completed: state.completed,
      sprint_id: state.sprint_id,
    });
  return { error: error?.message ?? null };
}

/** Apply a todo's full state (the sync upsert target). */
export async function updateTodoState(
  id: string,
  state: TodoState,
): Promise<{ error: string | null }> {
  const { error } = await (await createServerSupabaseClient())
    .from("todos")
    .update({
      title: state.title,
      start_time: state.start_time,
      end_time: state.end_time,
      assignee_id: state.assignee_id,
      blocker: state.blocker,
      completed: state.completed,
      sprint_id: state.sprint_id,
    })
    .eq("id", id);

  return { error: error?.message ?? null };
}

const SYNC_ROW_LIMIT = 5000;

/**
 * Every todo visible to this user, with owner/assignee display fields
 * joined — the payload the offline mirror is built from.
 */
export async function listTodosWithNames(userId: string): Promise<TeamTodo[]> {
  const rows = await listTodos(userId);
  const ids = new Set<string>();

  for (const row of rows) {
    ids.add(row.user_id);

    if (row.assignee_id) {
      ids.add(row.assignee_id);
    }
  }

  if (ids.size === 0) {
    return [];
  }

  const { data: profiles } = await (await createServerSupabaseClient())
    .from("profiles")
    .select("id,name,avatar_url")
    .in("id", [...ids]);

  const byId = new Map(
    ((profiles ?? []) as Assignee[]).map((profile) => [profile.id, profile]),
  );

  return rows.slice(0, SYNC_ROW_LIMIT).map((row) => {
    const owner = byId.get(row.user_id);
    const assignee = row.assignee_id ? byId.get(row.assignee_id) : undefined;

    return {
      ...row,
      owner_name: owner?.name ?? "",
      owner_avatar: owner?.avatar_url ?? null,
      assignee_name: assignee?.name ?? null,
      assignee_avatar: assignee?.avatar_url ?? null,
    };
  });
}
