import { createAdminClient } from "@/lib/supabase/admin";
import type { DailyReport } from "@/lib/types";

export async function getReport(
  userId: string,
  reportDate: string,
): Promise<DailyReport | null> {
  const { data } = await createAdminClient()
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", reportDate)
    .maybeSingle<DailyReport>();

  return data ?? null;
}

export async function listReports(userId: string, limit = 30): Promise<DailyReport[]> {
  const { data } = await createAdminClient()
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .order("report_date", { ascending: false })
    .limit(limit);

  return (data ?? []) as DailyReport[];
}

export async function countReports(userId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("daily_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return count ?? 0;
}

/**
 * File (or update) the report for a day. The database function advances the
 * streak and awards XP only when the day's report is new.
 */
export async function fileReport(
  userId: string,
  reportDate: string,
  fields: { yesterday: string; today: string; blockers: string },
): Promise<{ xp: number; streak: number; isNew: boolean; error: string | null }> {
  const { data, error } = await createAdminClient().rpc("file_daily_report", {
    p_user_id: userId,
    p_date: reportDate,
    p_yesterday: fields.yesterday,
    p_today: fields.today,
    p_blockers: fields.blockers,
  });

  if (error) {
    return { xp: 0, streak: 0, isNew: false, error: error.message };
  }

  const payload = (data ?? {}) as { xp?: number; streak?: number; new?: boolean };

  return {
    xp: Number(payload.xp ?? 0),
    streak: Number(payload.streak ?? 0),
    isNew: Boolean(payload.new),
    error: null,
  };
}

/** Which organization members have filed a report for the given day. */
export async function reportedUserIds(
  organizationId: string,
  reportDate: string,
): Promise<Set<string>> {
  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId);

  const ids = (profiles ?? []).map((row) => row.id as string);

  if (ids.length === 0) {
    return new Set();
  }

  const { data: reports } = await createAdminClient()
    .from("daily_reports")
    .select("user_id")
    .in("user_id", ids)
    .eq("report_date", reportDate);

  return new Set((reports ?? []).map((row) => row.user_id as string));
}
