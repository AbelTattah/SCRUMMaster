"use client";

import { toggleTodoLocal } from "@/lib/sync";

/**
 * The row checkbox. Offline-first: ticking updates the local mirror first
 * (the row flips instantly, network or not) and the encrypted change is
 * pushed in the background.
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
    <form action={async () => { await toggleTodoLocal(todoId, !completed); }} className="todo-toggle">
      <input type="hidden" name="id" value={todoId} />

      <input
        type="checkbox"
        className="todo-check"
        checked={completed}
        aria-label={`${completed ? "Mark as not completed" : "Mark as completed"}: ${title}`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}
