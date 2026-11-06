"use client";

import { useEffect, useRef, useState } from "react";

import { toggleTodoLocal } from "@/lib/sync";

/**
 * The row checkbox — offline-first.
 *
 * The visual state flips **synchronously** with the click (local React
 * state), so it never snaps back while the encrypted write and background
 * push are in flight; the server round-trip only confirms what the local
 * mirror already shows. The prop keeps long-running state (external
 * changes, pulls) in sync afterwards.
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
  const [checked, setChecked] = useState(completed);
  const pending = useRef(completed);

  // Server/local truth arrives after the mirror reloads — adopt it, but only
  // when nothing is in flight (the ref tracks the value we last requested).
  useEffect(() => {
    if (pending.current === completed) {
      setChecked(completed);
    }
  }, [completed]);

  return (
    <form className="todo-toggle">
      <input type="hidden" name="id" value={todoId} />

      <input
        type="checkbox"
        className="todo-check"
        checked={checked}
        aria-label={`${checked ? "Mark as not completed" : "Mark as completed"}: ${title}`}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          pending.current = next;
          setChecked(next);

          void toggleTodoLocal(todoId, next).catch(() => {
            // Roll back the optimistic flip if the local write failed.
            pending.current = !next;
            setChecked(!next);
          });
        }}
      />
    </form>
  );
}
