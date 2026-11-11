"use server";

import { requireOnboardedUser } from "@/lib/auth";
import {
  createSprint as createSprintRecord,
  listSprints as listSprintsRecord,
  updateSprintStatus as updateSprintStatusRecord,
  updateTodoSprint as updateTodoSprintRecord,
} from "@/lib/data/sprints";

export async function loadSprintsSync() {
  const current = await requireOnboardedUser();
  return listSprintsRecord(current.id);
}

export async function createSprintAction(name: string, goal: string | null, startDate: string, endDate: string) {
  const current = await requireOnboardedUser();
  const sprint = await createSprintRecord(current.id, name, goal, startDate, endDate);
  return sprint;
}

export async function updateSprintStatusAction(sprintId: string, status: "planned" | "active" | "completed") {
  const current = await requireOnboardedUser();
  return updateSprintStatusRecord(sprintId, status);
}

export async function assignTodoToSprintAction(todoId: string, sprintId: string | null) {
  const current = await requireOnboardedUser();
  return updateTodoSprintRecord(todoId, sprintId);
}
