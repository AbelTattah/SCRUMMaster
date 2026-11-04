"use client";

import { toggleTodoInline } from "@/app/actions/todos";

/**
 * The row checkbox. Uses the non-redirecting inline action so ticking a task
 * updates the list in place — no navigation, no scroll jump.
 */
export function TodoToggle({
  todoId,
  completed,
  title,
}: {
  todoId: string;
  completed: boolean;
  title: string;
  returnTo?: string;
}) {
  return (
    <form action={toggleTodoInline} className="todo-toggle">
      <input type="hidden" name="id" value={todoId} />

      <input
        type="checkbox"
        className="todo-check"
        defaultChecked={completed}
        aria-label={`${completed ? "Mark as not completed" : "Mark as completed"}: ${title}`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}
