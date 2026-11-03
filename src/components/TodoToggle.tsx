"use client";

import { toggleTodo } from "@/app/actions/todos";

export function TodoToggle({
  todoId,
  completed,
  title,
  returnTo,
}: {
  todoId: string;
  completed: boolean;
  title: string;
  returnTo: string;
}) {
  return (
    <form action={toggleTodo} className="todo-toggle">
      <input type="hidden" name="id" value={todoId} />
      <input type="hidden" name="return_to" value={returnTo} />

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
