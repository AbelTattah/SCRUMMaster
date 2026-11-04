import type { Metadata } from "next";
import Link from "next/link";

import { saveReport } from "@/app/actions/reports";
import { requireOnboardedUser } from "@/lib/auth";
import { countReports, getReport, listReports } from "@/lib/data/reports";
import { countTodos } from "@/lib/data/todos";
import { levelProgress, nextStreakBonus, XP_DAILY_REPORT } from "@/lib/gamification";
import { dateKey, formatDayLabel, formatDayShort } from "@/lib/time";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Daily report" };

function plural(value: number, word: string): string {
  return `${value} ${word}${value === 1 ? "" : "s"}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const today = dateKey();

  const [report, history, reportCount, counts] = await Promise.all([
    getReport(user.id, today),
    listReports(user.id, 30),
    countReports(user.id),
    countTodos(user.id),
  ]);

  const progress = levelProgress(user.profile.xp);
  const streak = user.profile.streak;
  const bonus = nextStreakBonus(streak, report !== null);
  const upcomingXp = XP_DAILY_REPORT + bonus;
  const pastHistory = history.filter((entry) => entry.report_date !== today);

  const error = firstParam(params.error).trim();

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Daily report</h1>
          <p className="date-line">{formatDayLabel(today)}</p>
        </div>
      </header>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="report-stats">
        <div className="stat-card">
          <span className="stat-label">Level</span>
          <strong className="stat-value">{progress.level}</strong>
          <div className="level-bar" aria-hidden="true">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="stat-meta">
            {progress.earned} / {progress.needed} XP to level {progress.level + 1}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Streak</span>
          <strong className="stat-value">{plural(streak, "day")}</strong>
          <span className="stat-meta">
            Best {user.profile.best_streak} day{user.profile.best_streak === 1 ? "" : "s"}
            {report === null && streak > 0 ? ` · file now for +${upcomingXp} XP` : ""}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total XP</span>
          <strong className="stat-value">{user.profile.xp}</strong>
          <span className="stat-meta">{plural(counts.completed, "task")} completed</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Reports filed</span>
          <strong className="stat-value">{reportCount}</strong>
          <span className="stat-meta">
            {reportCount === 0 ? "Start with today's" : "Keep it going"}
          </span>
        </div>
      </div>

      <form action={saveReport} className="card report-form">
        <h2 className="card-title">
          {report ? "Update today's report" : "File today's report"}
        </h2>
        <p className="card-sub">
          Record what got done, what is next and what is in the way. Filing earns{" "}
          {report ? "nothing more today — edits are free" : `+${upcomingXp} XP`}
          {report === null && streak > 0 ? ` and keeps your ${plural(streak, "day")} streak alive` : ""}.
        </p>

        <label className="field">
          <span>Yesterday&rsquo;s achievements</span>
          <textarea
            className="input textarea"
            name="yesterday"
            rows={4}
            maxLength={2000}
            defaultValue={report?.yesterday ?? ""}
            placeholder="What did you get done?"
          />
        </label>

        <label className="field">
          <span>Today&rsquo;s plan</span>
          <textarea
            className="input textarea"
            name="today"
            rows={4}
            maxLength={2000}
            defaultValue={report?.today ?? ""}
            placeholder="What will you deliver today?"
          />
        </label>

        <label className="field">
          <span>Current blockers</span>
          <textarea
            className="input textarea"
            name="blockers"
            rows={3}
            maxLength={2000}
            defaultValue={report?.blockers ?? ""}
            placeholder="What is in your way?"
          />
          <span className="field-hint">
            Task-level blockers can also be recorded from a task&rsquo;s menu.
          </span>
        </label>

        <button className="btn-primary" type="submit">
          {report ? "Update report" : "Save report"}
        </button>
      </form>

      <section className="card report-history">
        <h2 className="card-title">History</h2>
        <p className="card-sub">
          {pastHistory.length === 0
            ? "Your reports will collect here."
            : `Your last ${plural(pastHistory.length, "report")}.`}
        </p>

        {pastHistory.length === 0 ? (
          <p className="empty">No earlier reports yet — today&rsquo;s is the first.</p>
        ) : (
          pastHistory.map((entry) => (
            <details className="report-entry" key={entry.id}>
              <summary>
                <span className="report-entry-date">
                  {formatDayShort(entry.report_date)}
                </span>
                <span className="report-entry-preview">
                  {firstLine(entry.today) || firstLine(entry.yesterday) || "No details"}
                </span>
              </summary>

              <div className="report-entry-body">
                {entry.yesterday ? (
                  <div>
                    <h4>Yesterday</h4>
                    <p>{entry.yesterday}</p>
                  </div>
                ) : null}

                {entry.today ? (
                  <div>
                    <h4>Today</h4>
                    <p>{entry.today}</p>
                  </div>
                ) : null}

                {entry.blockers ? (
                  <div>
                    <h4>Blockers</h4>
                    <p>{entry.blockers}</p>
                  </div>
                ) : null}
              </div>
            </details>
          ))
        )}
      </section>

      <p className="report-foot">
        Need to change an older day? Reports are locked to the day they were
        filed — <Link href="/notifications">notifications</Link> show what needs
        attention right now.
      </p>
    </>
  );
}

function firstLine(value: string): string {
  const line = value.split("\n").find((part) => part.trim() !== "") ?? "";

  return line.trim().slice(0, 90);
}
