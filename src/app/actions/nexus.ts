"use server";

import { requireOnboardedUser } from "@/lib/auth";
import {
  assignTodoToNexusStream,
  createNexusStream,
  deleteNexusStream,
  listNexusStreams,
} from "@/lib/data/nexus";

export async function loadNexusStreams(organizationId: string) {
  await requireOnboardedUser();
  return listNexusStreams(organizationId);
}

export async function createNexusStreamAction(
  organizationId: string,
  name: string,
  purpose: "integration" | "architecture_quality" | "governance",
) {
  const current = await requireOnboardedUser();

  if (!current.organization || current.organization.id !== organizationId) {
    return null;
  }

  return createNexusStream(organizationId, name.trim() || "New stream", purpose);
}

export async function deleteNexusStreamAction(streamId: string) {
  const current = await requireOnboardedUser();

  if (!current.organization) {
    return false;
  }

  return deleteNexusStream(streamId);
}

export async function assignTodoToNexusStreamAction(
  todoId: string,
  streamId: string | null,
) {
  const current = await requireOnboardedUser();

  if (!current.organization) {
    return false;
  }

  return assignTodoToNexusStream(todoId, streamId);
}
