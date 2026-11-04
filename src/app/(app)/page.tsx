import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { BlockerModal } from "@/components/BlockerModal";
import { LandingPage } from "@/components/LandingPage";
import { AddTodoButton, AddTodoFab, TodoModal } from "@/components/TodoModal";
import { TodoRow } from "@/components/TodoRow";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { getReport } from "@/lib/data/reports";
import { findTodo, listTodos } from "@/lib/data/todos";
import { levelFor } from "@/lib/gamification";
import { dateKey, greetingFor, todayLine } from "@/lib/time";
import type { Assignee, PageFilter } from "@/lib/types";
import { firstParam, isUuid } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();

  return user
    ? { title: "Home" }
    : { title: { absolute: "Scrum Master — tasks, reminders and your team" } };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();

  // The public landing page for signed-out visitors (see the layout above).
  if (!current) {
    return <LandingPage />;
  }

  const user = await requireOnboardedUser();
  const params = await searchParams;

  const rawPage = firstParam(params.page);
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" ? rawPage : "home";
  const q = firstParam(params.q).trim();

  const editId = firstParam(params.edit);

  const [todos, editTodo, members, todayReport] = await Promise.all([
    listTodos(user.id, page, q),
    editId && isUuid(editId) ? findTodo(editId, user.id) : Promise.resolve(null),
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
  // "?edit=" opens the edit dialog for the creator; an assignee only ever
  // gets the blocker dialog (and only when the task actually is blocked).
  const canEdit = editTodo !== null && editTodo.user_id === user.id;
  const blockedForAssignee = editTodo !== null && !canEdit && editTodo.blocker !== null;
  const initialOpen = params.add !== undefined || canEdit;

  const assignees: Assignee[] = members.map((member) => ({
    id: member.id,
    name: member.name,
    avatar_url: member.avatar_url,
  }));
  // The owner picks from everyone but themselves (assigning to self is the
  // same as leaving it unassigned).
  const assignable = user.isOwner
    ? assignees.filter((member) => member.id !== user.id)
    : null;

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
              <>
                Nothing here yet — press <strong className="only-desktop">Add Todo</strong>
                <strong className="only-mobile">+</strong> to create your first task.
              </>
            )}
          </p>
        ) : (
          todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              returnTo={returnTo}
              currentUserId={user.id}
              assignees={assignees}
            />
          ))
        )}
      </section>

      <Suspense fallback={null}>
        <TodoModal
          initialTodo={canEdit ? editTodo : null}
          initialOpen={initialOpen}
          initialReturnTo={returnTo}
          assignees={assignable}
        />
        <BlockerModal
          initialTodo={blockedForAssignee ? editTodo : null}
          initialOpen={blockedForAssignee}
          initialReturnTo={returnTo}
        />
      </Suspense>
    </>
  );
}
