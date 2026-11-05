"use server";

/**
 * The offline-first sync endpoint.
 *
 * The client keeps an encrypted local mirror and an outbox; this action is
 * the outbox's drain. Payloads are full row state (ciphertext titles/blockers
 * plus plaintext scheduling metadata), which makes every push idempotent.
 * The server applies the same authorisation rules as the inline editors —
 * it just never reads the content it is storing.
 */
import { revalidatePath } from "next/cache";

import { requireOnboardedUser } from "@/lib/auth";
import { addXp } from "@/lib/data/gamification";
import {
  deleteTodo as deleteTodoRecord,
  findManagedTodo,
  insertTodoWithId,
  listTodosWithNames,
  listTeamTodos,
  updateTodoState,
} from "@/lib/data/todos";
import { isEncrypted } from "@/lib/crypto";
import { XP_TASK_COMPLETE } from "@/lib/gamification";
import { sanitizeTime } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/utils";
import type { CurrentUser } from "@/lib/types";

export interface PushOp {
  kind: "upsert" | "delete";
  id: string;
  title?: string;
  start_time?: string | null;
  end_time?: string | null;
  assignee_id?: string | null;
  blocker?: string | null;
  completed?: boolean;
}

export interface PushResult {
  id: string;
  ok: boolean;
  error?: string;
}

const MAX_TITLE = 2000;
const MAX_BLOCKER = 2500;

/** Same rule as the inline editor: only the owner can hand out assignments. */
async function resolveAssignee(
  current: CurrentUser,
  raw: string | null | undefined,
): Promise<string | null> {
  if (!raw || !isUuid(raw) || raw === current.id) {
    return null;
  }

  if (!current.isOwner || !current.organization) {
    return null;
  }

  const { data } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("id", raw)
    .eq("organization_id", current.organization.id)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

function validateState(op: PushOp): string | null {
  const title = op.title ?? "";

  if (title.length === 0) {
    return "Please enter a todo title.";
  }

  // Plaintext (legacy) keeps the old1..200 contract; ciphertext carries the
  // "enc:v1:" envelope and is bounded by the relaxed column check.
  if (isEncrypted(title) ? title.length > MAX_TITLE : title.length > 200) {
    return "That title is too long.";
  }

  const blocker = op.blocker;

  if (
    blocker != null &&
    (isEncrypted(blocker) ? blocker.length > MAX_BLOCKER : blocker.length > 500)
  ) {
    return "That blocker note is too long.";
  }

  return null;
}

async function applyOp(current: CurrentUser, op: PushOp): Promise<PushResult> {
  if (!isUuid(op.id)) {
    return { id: op.id, ok: false, error: "Invalid task id." };
  }

  if (op.kind === "delete") {
    const managed = await findManagedTodo(op.id, current);

    // Already gone (a retried outbox entry) — success.
    if (!managed) {
      return { id: op.id, ok: true };
    }

    if (managed.role === "assignee") {
      return { id: op.id, ok: false, error: "Only the person who created a task can delete it." };
    }

    await deleteTodoRecord(op.id);
    return { id: op.id, ok: true };
  }

  const problem = validateState(op);

  if (problem) {
    return { id: op.id, ok: false, error: problem };
  }

  const managed = await findManagedTodo(op.id, current);

  if (managed) {
    const canEdit = managed.role === "creator" || managed.role === "owner";
    const title = canEdit ? op.title! : managed.todo.title;
    const start = canEdit ? sanitizeTime(op.start_time ?? null) : managed.todo.start_time;
    const end = canEdit ? sanitizeTime(op.end_time ?? null) : managed.todo.end_time;
    const assignee = canEdit
      ? await resolveAssignee(current, op.assignee_id)
      : managed.todo.assignee_id;

    // Completing or blocking is the assignee's call too (parity with the
    // inline editors); finishing a task clears whatever was blocking it.
    const completed = op.completed ?? managed.todo.completed;
    const blocker = completed ? null : (op.blocker ?? managed.todo.blocker);
    const justCompleted = !managed.todo.completed && completed;

    const { error } = await updateTodoState(op.id, {
      title,
      start_time: start,
      end_time: end,
      assignee_id: assignee,
      blocker,
      completed,
    });

    if (error) {
      return { id: op.id, ok: false, error };
    }

    if (justCompleted) {
      // The work belongs to the assignee when there is one.
      await addXp(managed.todo.assignee_id ?? managed.todo.user_id, XP_TASK_COMPLETE);
    }

    return { id: op.id, ok: true };
  }

  // New task: only the signed-in user can be its creator.
  const state = {
    title: op.title!,
    start_time: sanitizeTime(op.start_time ?? null),
    end_time: sanitizeTime(op.end_time ?? null),
    assignee_id: await resolveAssignee(current, op.assignee_id),
    blocker: op.completed ? null : (op.blocker ?? null),
    completed: op.completed ?? false,
  };

  const { error } = await insertTodoWithId(current.id, op.id, state);

  if (error) {
    return { id: op.id, ok: false, error };
  }

  if (state.completed) {
    await addXp(state.assignee_id ?? current.id, XP_TASK_COMPLETE);
  }

  return { id: op.id, ok: true };
}

/** Drain a batch of outbox entries. Per-op results; partial failure is fine. */
export async function pushTodos(ops: PushOp[]): Promise<PushResult[]> {
  const current = await requireOnboardedUser();
  const results: PushResult[] = [];
  let changed = false;

  for (const op of ops.slice(0, 100)) {
    try {
      const result = await applyOp(current, op);
      results.push(result);
      changed = changed || result.ok;
    } catch {
      results.push({ id: op.id, ok: false, error: "Unexpected server error." });
    }
  }

  if (changed) {
    revalidatePath("/", "layout");
  }

  return results;
}

/** Pull every todo visible to the signed-in user (home + assigned). */
export async function loadTodosSync(): Promise<Awaited<ReturnType<typeof listTodosWithNames>>> {
  const current = await requireOnboardedUser();

  return listTodosWithNames(current.id);
}

/** Pull the whole organization's todos (owner only — the team board). */
export async function loadTeamTodosSync(): Promise<Awaited<ReturnType<typeof listTodosWithNames>>> {
  const current = await requireOnboardedUser();

  if (!current.isOwner || !current.organization) {
    return [];
  }

  const { todos } = await listTeamTodos(current.organization.id);

  return todos;
}
