import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddTaskRow, AddTodoButton, AddTodoFab } from "@/components/AddTask";
import { TaskRow } from "@/components/TaskRow";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { getReport } from "@/lib/data/reports";
import { listTodos } from "@/lib/data/todos";
import { levelFor } from "@/lib/gamification";
import { dateKey, greetingFor, todayLine } from "@/lib/time";
import type { PageFilter } from "@/lib/types";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();

  // "/" is the app's front door: signed-out visitors go straight to the sign-in
  // screen (silently — every other route below asks them to sign in with a
  // notice of its own).
  if (!current) {
    redirect("/login");
  }

  const user = await requireOnboardedUser();
  const params = await searchParams;

  const rawPage = firstParam(params.page);
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" ? rawPage : "home";
  const q = firstParam(params.q).trim();

  // "?edit=" centres that row and starts renaming it; "?add=" opens the
  // inline composer (used by the header button and the phone FAB).
  const focusId = firstParam(params.edit);
  const openAdd = params.add !== undefined;

  const [todos, members, todayReport] = await Promise.all([
    listTodos(user.id, page, q),
    user.organization
      ? listMembers(user.organization.id, user.organization.owner_id)
      : Promise.resolve([]),
    getReport(user.id, dateKey()),
  ]);

  const search = new URLSearchParams();
  if (page !== "home") {
    search.set("page", page);
  }
  if (q) {
    search.set("q", q);
  }
  const returnTo = search.toString() ? `/?${search.toString()}` : "/";

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">{greetingFor(user.profile.name)}</h1>
          <p className="date-line">{todayLine()}</p>
        </div>

        <AddTodoButton returnTo={returnTo} />
      </header>

      <div className={`report-nudge${todayReport ? " is-done" : ""}`}>
        <div className="report-nudge-text">
          {todayReport ? (
            <>
              <strong>Today&rsquo;s report is filed</strong>
              <span>
                Level {levelFor(user.profile.xp)} · {user.profile.xp} XP ·{" "}
                {user.profile.streak}-day streak
              </span>
            </>
          ) : (
            <>
              <strong>Daily report not filed yet</strong>
              <span>
                Yesterday&rsquo;s wins, today&rsquo;s plan and blockers — it takes a
                minute.
              </span>
            </>
          )}
        </div>

        <Link className="btn-primary btn-small" href="/reports">
          {todayReport ? "View report" : "File report"}
        </Link>
      </div>

      <AddTodoFab returnTo={returnTo} />

      <section className="panel" aria-label="Todos">
        {todos.length === 0 ? (
          <p className="empty">
            {q ? (
              <>No todos match &ldquo;{q}&rdquo;.</>
            ) : (
              <>Nothing here yet — add your first task below.</>
            )}
          </p>
        ) : (
          todos.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              returnTo={returnTo}
              variant="home"
              currentUserId={user.id}
              members={members}
              canAssign={user.isOwner}
              focus={focusId !== "" && todo.id === focusId}
            />
          ))
        )}

        <AddTaskRow returnTo={returnTo} autoFocus={openAdd} />
      </section>
    </>
  );
}
