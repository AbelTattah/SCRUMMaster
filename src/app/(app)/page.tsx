import { Suspense } from "react";
import type { Metadata } from "next";

import { AddTodoButton, AddTodoFab, TodoModal } from "@/components/TodoModal";
import { LandingPage } from "@/components/LandingPage";
import { TodoRow } from "@/components/TodoRow";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { findTodo, listTodos } from "@/lib/data/todos";
import { greetingFor, todayLine } from "@/lib/time";
import type { PageFilter } from "@/lib/types";
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

  const todos = await listTodos(user.id, page, q);

  const editId = firstParam(params.edit);
  const editTodo = editId && isUuid(editId) ? await findTodo(editId, user.id) : null;

  const search = new URLSearchParams();
  if (page !== "home") {
    search.set("page", page);
  }
  if (q) {
    search.set("q", q);
  }
  const returnTo = search.toString() ? `/?${search.toString()}` : "/";
  const initialOpen = params.add !== undefined || editTodo !== null;

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">{greetingFor(user.profile.name)}</h1>
          <p className="date-line">{todayLine()}</p>
        </div>

        <AddTodoButton returnTo={returnTo} />
      </header>

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
          todos.map((todo) => <TodoRow key={todo.id} todo={todo} returnTo={returnTo} />)
        )}
      </section>

      <Suspense fallback={null}>
        <TodoModal
          initialTodo={editTodo}
          initialOpen={initialOpen}
          initialReturnTo={returnTo}
        />
      </Suspense>
    </>
  );
}
