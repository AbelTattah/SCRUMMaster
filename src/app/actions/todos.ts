"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import {
  createTodo,
  deleteTodo as deleteTodoRecord,
  findTodo,
  toggleTodo as toggleTodoRecord,
  updateTodo,
} from "@/lib/data/todos";
import { sanitizeTime } from "@/lib/time";
import { isUuid, safeNext } from "@/lib/utils";

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

export async function saveTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const back = returnTo(formData);
  const id = field(formData, "id");
  const title = field(formData, "title").trim();
  const start = sanitizeTime(formData.get("start_time"));
  const end = sanitizeTime(formData.get("end_time"));

  const problem = guard(title.length);

  if (problem) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(problem)}`);
  }

  if (id && isUuid(id)) {
    const existing = await findTodo(id, current.id);

    if (!existing) {
      redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent("That todo no longer exists.")}`);
    }

    await updateTodo(id, current.id, title, start, end);
  } else {
    const { error } = await createTodo(current.id, title, start, end);

    if (error) {
      redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);
    }
  }

  revalidatePath("/", "layout");
  redirect(back);
}

export async function toggleTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");

  if (isUuid(id)) {
    await toggleTodoRecord(id, current.id);
    revalidatePath("/", "layout");
  }

  redirect(returnTo(formData));
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();
  const id = field(formData, "id");

  if (isUuid(id)) {
    await deleteTodoRecord(id, current.id);
    revalidatePath("/", "layout");
  }

  redirect(returnTo(formData));
}
