"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { addXp } from "@/lib/data/gamification";
import {
  createTodo,
  deleteTodo as deleteTodoRecord,
  findManagedTodo,
  setBlocker as setBlockerRecord,
  toggleTodo as toggleTodoRecord,
  updateTodo,
} from "@/lib/data/todos";
import { XP_TASK_COMPLETE } from "@/lib/gamification";
import { sanitizeTime } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, safeNext } from "@/lib/utils";
import type { CurrentUser } from "@/lib/types";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function returnTo(formData: FormData): string {
  return safeNext(field(formData, "return_to"));
}

function guard(length: number): string | null {
  if (length === 0 || length > 200) {
    return "Please enter a todo title.";
  }

  return null;
}

function fail(back: string, message: string): never {
  redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

/**
 * The organization owner may hand a task to a member — including someone who
 * has not signed in yet. Anything else (a member posting the field, an id
 * outside the organization, the owner's own id) is normalised away so the
 * server never trusts the form.
 */
async function resolveAssignee(
  current: CurrentUser,
  raw: string,
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

export async function saveTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const back = returnTo(formData);
  const id = field(formData, "id");
  const title = field(formData, "title").trim();
  const start = sanitizeTime(formData.get("start_time"));
  const end = sanitizeTime(formData.get("end_time"));

  const problem = guard(title.length);

  if (problem) {
    fail(back, problem);
  }

  if (id && isUuid(id)) {
    const managed = await findManagedTodo(id, current);

    if (!managed) {
      fail(back, "That todo no longer exists.");
    }

    // The assignee can tick the task off and record blockers, but only its
    // creator (or the organization owner) changes what the task *is*.
    if (managed.role === "assignee") {
      fail(back, "Only the person who created a task can edit it.");
    }

    const assignee = await resolveAssignee(current, field(formData, "assignee"));

    await updateTodo(id, title, start, end, assignee);
  } else {
    const assignee = await resolveAssignee(current, field(formData, "assignee"));
    const { error } = await createTodo(current.id, title, start, end, assignee);

    if (error) {
      fail(back, error);
    }
  }

  revalidatePath("/", "layout");
  redirect(back);
}

export async function toggleTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");

  if (isUuid(id)) {
    const managed = await findManagedTodo(id, current);

    if (managed) {
      const result = await toggleTodoRecord(id);

      if (result?.completed) {
        // The work belongs to the assignee when there is one — ticking off
        // someone's task credits them, not the person clicking.
        await addXp(result.assignee_id ?? result.user_id, XP_TASK_COMPLETE);
      }

      revalidatePath("/", "layout");
    }
  }

  redirect(returnTo(formData));
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");
  const back = returnTo(formData);

  if (isUuid(id)) {
    const managed = await findManagedTodo(id, current);

    if (managed && managed.role === "assignee") {
      fail(back, "Only the person who created a task can delete it.");
    }

    if (managed) {
      await deleteTodoRecord(id);
      revalidatePath("/", "layout");
    }
  }

  redirect(back);
}

export async function setBlocker(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");
  const blocker = field(formData, "blocker").trim().slice(0, 500);
  const back = returnTo(formData);

  if (isUuid(id)) {
    const managed = await findManagedTodo(id, current);

    if (managed) {
      const { error } = await setBlockerRecord(id, blocker || null);
      revalidatePath("/", "layout");

      if (error) {
        fail(back, error);
      }
    }
  }

  redirect(back);
}

export async function clearBlocker(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");
  const back = returnTo(formData);

  if (isUuid(id)) {
    const managed = await findManagedTodo(id, current);

    if (managed) {
      await setBlockerRecord(id, null);
      revalidatePath("/", "layout");
    }
  }

  redirect(back);
}
