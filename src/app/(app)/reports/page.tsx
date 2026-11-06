import type { Metadata } from "next";

import { ReportClient } from "@/components/ReportClient";
import { requireOnboardedUser } from "@/lib/auth";
import { buildReport, type ReportTask } from "@/lib/data/reports";
import { appTimezone } from "@/lib/env";
import {
  parseDateKey,
  parsePeriod,
  reportWindow,
  type ReportScope,
} from "@/lib/reportPeriods";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

function longDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: appTimezone(),
  }).format(date);
}

/**
 * Task titles are encrypted — the report body (rows + PDF) renders in the
 * browser where they can be decrypted; only the query and the summary
 * numbers stay server-side.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  const period = parsePeriod(firstParam(params.period));
  const dateKey = parseDateKey(firstParam(params.date));
  // Owners default to the whole organization (they asked for org downloads);
  // members only ever see their own working set.
  const scope: ReportScope =
    user.isOwner && user.organization && firstParam(params.scope) !== "mine"
      ? "org"
      : "mine";

  const window = reportWindow(period, dateKey);
  const data = await buildReport({
    start: window.start,
    end: window.end,
    scope,
    userId: user.id,
    organizationId: user.organization?.id ?? null,
    organizationName: user.organization?.name ?? null,
  });

  const { summary } = data;

  // Header fields for the stand-up document (computed here so the client
  // never needs the app timezone).
  const rangeEnd = new Date(window.end.getTime() - 86_400_000);
  const startText = longDate(window.start);
  const endText = longDate(rangeEnd);
  const periodRange = startText === endText ? startText : `${startText} – ${endText}`;
  const meetingDate = longDate(new Date());

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Reports</h1>
          <p className="date-line">
            {window.label} · {data.scopeLabel}
          </p>
        </div>
      </header>

      <div className="report-stats">
        <div className="stat-card">
          <span className="stat-label">Created</span>
          <strong className="stat-value">{summary.created}</strong>
          <span className="stat-meta">in this period</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value">{summary.completed}</strong>
          <span className="stat-meta">{summary.rate}% completion rate</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">In progress</span>
          <strong className="stat-value">{summary.inProgress}</strong>
          <span className="stat-meta">still open</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Blocked</span>
          <strong className="stat-value">{summary.blocked}</strong>
          <span className="stat-meta">
            {summary.blocked > 0 ? "needs attention" : "nothing blocked"}
          </span>
        </div>
      </div>

      <ReportClient
        period={period}
        dateKey={dateKey}
        prevDate={window.prevDate}
        nextDate={window.nextDate}
        scope={scope}
        canSwitchScope={Boolean(user.isOwner && user.organization)}
        windowLabel={window.label}
        filename={window.filename}
        scopeLabel={data.scopeLabel}
        periodRange={periodRange}
        meetingDate={meetingDate}
        orgName={user.organization?.name ?? "Personal account"}
        authorName={user.profile.name}
        tasks={data.tasks as ReportTask[]}
        summary={summary}
      />
    </>
  );
}
