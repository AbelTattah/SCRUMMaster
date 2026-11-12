import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface NexusStream {
  id: string;
  organization_id: string;
  name: string;
  purpose: "integration" | "architecture_quality" | "governance";
  created_at: string;
}

export async function listNexusStreams(organizationId: string): Promise<NexusStream[]> {
  const { data } = await (await createServerSupabaseClient())
    .from("nexus_streams")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return (data ?? []) as NexusStream[];
}

export async function createNexusStream(
  organizationId: string,
  name: string,
  purpose: NexusStream["purpose"],
): Promise<NexusStream | null> {
  const { data, error } = await createAdminClient()
    .from("nexus_streams")
    .insert({ organization_id: organizationId, name, purpose })
    .select()
    .single();

  if (error) {
    return null;
  }

  return data as NexusStream;
}

export async function deleteNexusStream(streamId: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("nexus_streams")
    .delete()
    .eq("id", streamId);

  return !error;
}

export async function assignTodoToNexusStream(
  todoId: string,
  streamId: string | null,
): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("todos")
    .update({ nexus_stream_id: streamId })
    .eq("id", todoId);

  return !error;
}
