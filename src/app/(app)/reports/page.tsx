import type { Metadata } from "next";
import { cookies } from "next/headers";

import { GuestSignInRequired } from "@/components/GuestSignInRequired";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  const isGuest = !current && (await cookies()).get("scrum-guest")?.value === "1";

  if (isGuest) {
    return (
      <GuestSignInRequired
        title="Reports"
        description="Sign in to generate and download stand-up reports. Guest mode keeps your tasks local on this device."
      />
    );
  }

  const { requireOnboardedUser } = await import("@/lib/auth");
  const { buildReport } = await import("@/lib/data/reports");
  const { appTimezone } = await import("@/lib/env");
  const { parseDateKey, parsePeriod, reportWindow } = await import("@/lib/reportPeriods");
  const { firstParam } = await import("@/lib/utils");
  const { ReportClient } = await import("@/components/ReportClient");

  const user = await requireOnboardedUser();
  const params = await searchParams;

  const period = parsePeriod(firstParam(params.period));
  const dateKey = parseDateKey(firstParam(params.date));
  const scope =
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

  function longDate(date: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: appTimezone(),
    }).format(date);
  }

  const rangeEnd = new Date(window.end.getTime() - 86_400_000);
  const startText = longDate(window.start);
  const endText = longDate(rangeEnd);
  const periodRange = startText === endText ? startText : `${startText} - ${endText}`;
  const meetingDate = longDate(new Date());

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Reports</h1>
          <p className="date-line">
            {window.label} • {data.scopeLabel}
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
        tasks={data.tasks}
        summary={summary}
      />
    </>
  );
}
