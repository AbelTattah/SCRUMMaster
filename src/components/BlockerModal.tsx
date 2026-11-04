"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { clearBlocker, setBlocker } from "@/app/actions/todos";
import type { Todo } from "@/lib/types";

const OPEN_EVENT = "Scrum Master:blocker:open";

interface OpenDetail {
  todo: Todo;
  returnTo: string;
}

function dispatchOpen(detail: OpenDetail) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail }));
}

/** Kebab-menu entry that opens the blocker dialog for one task. */
export function BlockerButton({ todo, returnTo }: { todo: Todo; returnTo: string }) {
  return (
    <a
      href="#blocker"
      onClick={(event) => {
        event.preventDefault();
        dispatchOpen({ todo, returnTo });
      }}
    >
      {todo.blocker ? "Edit blocker" : "Blocker"}
    </a>
  );
}

/**
 * Record what is stopping a task. Both the assignee and the task's creator
 * can open it from the row menu; an empty description clears the blocker.
 */
export function BlockerModal({
  initialTodo,
  initialOpen,
  initialReturnTo,
}: {
  initialTodo: Todo | null;
  initialOpen: boolean;
  initialReturnTo: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [todo, setTodo] = useState<Todo | null>(initialTodo);
  const [returnTo, setReturnTo] = useState(initialReturnTo);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<OpenDetail>).detail;

      if (!detail) {
        return;
      }

      setTodo(detail.todo);
      setReturnTo(detail.returnTo);
      setOpen(true);
    }

    window.addEventListener(OPEN_EVENT, onOpen);

    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
    // close() only depends on router/searchParams; re-binding is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pathname, searchParams]);

  function close() {
    setOpen(false);
  }

  if (!open || !todo) {
    return null;
  }

  return (
    <div
      className="modal-backdrop is-open"
      id="blocker-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="blocker-modal-title">
        <form action={setBlocker} className="modal-form">
          <input type="hidden" name="id" value={todo.id} />
          <input type="hidden" name="return_to" value={returnTo} />

          <h2 id="blocker-modal-title">Blocker</h2>
          <p className="modal-sub">
            What is stopping “{todo.title}”? The team sees this on the task.
          </p>

          <label className="field">
            <span>Description</span>
            <textarea
              className="input textarea"
              name="blocker"
              rows={4}
              maxLength={500}
              defaultValue={todo.blocker ?? ""}
              placeholder="e.g. Waiting for the API credentials from the client"
              autoFocus
            />
            <span className="field-hint">
              Leave empty and save to clear the blocker.
            </span>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close}>
              Cancel
            </button>
            {todo.blocker ? (
              <button type="submit" formAction={clearBlocker} className="btn-danger">
                Clear
              </button>
            ) : null}
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
