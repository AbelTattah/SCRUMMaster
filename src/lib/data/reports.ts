import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportScope } from "@/lib/reportPeriods";
import type { Todo } from "@/lib/types";

export interface ReportTask extends Todo {
  creator_name: string;
  assignee_name: string | null;
}

export interface ReportSummary {
  created: number;
  completed: number;
  inProgress: number;
  blocked: number;
  /** Share of created tasks that are finished, 0–100. */
  rate: number;
}

export interface ReportData {
  tasks: ReportTask[];
  summary: ReportSummary;
  /** "Entire organization — Test" or "My tasks". */
  scopeLabel: string;
}

export interface ReportQuery {
  start: Date;
  end: Date;
  scope: ReportScope;
  userId: string;
  organizationId: string | null;
  organizationName: string | null;
}

/**
 * Every task CREATED inside [start, end) for the chosen scope — the whole
 * organization for owners, the caller's own working set (created by them or
 * assigned to them) otherwise.
 */
export async function buildReport(query: ReportQuery): Promise<ReportData> {
  const admin = createAdminClient();
  const startIso = query.start.toISOString();
  const endIso = query.end.toISOString();

  let request = admin.from("todos").select("*");

  let people = new Map<string, { name: string }>();

  if (query.scope === "org" && query.organizationId) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,name")
      .eq("organization_id", query.organizationId);

    for (const profile of profiles ?? []) {
      people.set(profile.id as string, { name: profile.name as string });
    }

    const ids = [...people.keys()];

    if (ids.length === 0) {
      return {
        tasks: [],
        summary: { created: 0, completed: 0, inProgress: 0, blocked: 0, rate: 0 },
        scopeLabel: `Entire organization — ${query.organizationName ?? ""}`.trim(),
      };
    }

    request = request.in("user_id", ids);
  } else {
    request = request.or(`user_id.eq.${query.userId},assignee_id.eq.${query.userId}`);

    // Names for the assignee/creator columns of "my tasks" reports.
    if (query.organizationId) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id,name")
        .eq("organization_id", query.organizationId);

      for (const profile of profiles ?? []) {
        people.set(profile.id as string, { name: profile.name as string });
      }
    }
  }

  const { data } = await request
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as Todo[];

  const tasks: ReportTask[] = rows.map((todo) => ({
    ...todo,
    creator_name: people.get(todo.user_id)?.name ?? "",
    assignee_name: todo.assignee_id ? (people.get(todo.assignee_id)?.name ?? null) : null,
  }));

  const completed = tasks.filter((task) => task.completed).length;
  const blocked = tasks.filter((task) => task.blocker !== null).length;

  return {
    tasks,
    summary: {
      created: tasks.length,
      completed,
      inProgress: tasks.length - completed,
      blocked,
      rate: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
    },
    scopeLabel:
      query.scope === "org" && query.organizationId
        ? `Entire organization — ${query.organizationName ?? ""}`.trim()
        : "My tasks",
  };
}
