import type { Metadata } from "next";

import { ReportControls } from "@/components/ReportControls";
import { Icon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { buildReport, type ReportTask } from "@/lib/data/reports";
import {
  parseDateKey,
  parsePeriod,
  reportWindow,
  type ReportScope,
} from "@/lib/reportPeriods";
import { formatStamp, formatTimeRange } from "@/lib/time";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

function statusOf(task: ReportTask): { key: string; label: string } {
  if (task.completed) {
    return { key: "done", label: "Completed" };
  }

  if (task.blocker) {
    return { key: "blocked", label: "Blocked" };
  }

  return { key: "open", label: "In progress" };
}

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

  const pdfHref = `/api/reports/pdf?period=${period}&date=${dateKey}&scope=${scope}`;
  const { summary } = data;

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

      <ReportControls
        period={period}
        dateKey={dateKey}
        prevDate={window.prevDate}
        nextDate={window.nextDate}
        scope={scope}
        canSwitchScope={Boolean(user.isOwner && user.organization)}
        pdfHref={pdfHref}
      />

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

      <section className="panel report-tasks" aria-label="Tasks in this period">
        {data.tasks.length === 0 ? (
          <p className="empty">
            No tasks were created in {window.label.toLowerCase()}.
          </p>
        ) : (
          data.tasks.map((task) => {
            const status = statusOf(task);
            const range = formatTimeRange(task.start_time, task.end_time);

            return (
              <div
                className={`report-task${task.completed ? " is-done" : ""}`}
                key={task.id}
              >
                <span
                  className={`report-dot report-dot--${status.key}`}
                  aria-hidden="true"
                />

                <span className="report-task-title">{task.title}</span>

                <span className="report-task-meta">
                  {task.assignee_name ? (
                    <span className="chip chip--assignee">{task.assignee_name}</span>
                  ) : null}

                  {scope === "org" && task.creator_name ? (
                    <span className="report-by">by {task.creator_name}</span>
                  ) : null}

                  {range ? (
                    <span className="report-range">
                      <Icon name="clock" />
                      <span>{range}</span>
                    </span>
                  ) : null}

                  <span className="report-created">{formatStamp(task.created_at)}</span>

                  <span className={`report-chip report-chip--${status.key}`}>
                    {status.label}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
