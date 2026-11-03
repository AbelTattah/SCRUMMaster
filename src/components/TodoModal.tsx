"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { saveTodo } from "@/app/actions/todos";
import { Icon } from "@/components/icons";
import type { Todo } from "@/lib/types";

const OPEN_EVENT = "kpime:todo:open";

interface OpenDetail {
  todo: Todo | null;
  returnTo: string;
}

function addParam(path: string, key: string, value: string): string {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function dispatchOpen(detail: OpenDetail) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail }));
}

export function AddTodoButton({ returnTo }: { returnTo: string }) {
  return (
    <a
      className="btn-add"
      href={addParam(returnTo, "add", "1")}
      onClick={(event) => {
        event.preventDefault();
        dispatchOpen({ todo: null, returnTo });
      }}
    >
      <Icon name="plus" strokeWidth={2.4} />
      Add Todo
    </a>
  );
}

export function AddTodoFab({ returnTo }: { returnTo: string }) {
  return (
    <a
      className="fab"
      href={addParam(returnTo, "add", "1")}
      aria-label="Add todo"
      onClick={(event) => {
        event.preventDefault();
        dispatchOpen({ todo: null, returnTo });
      }}
    >
      <Icon name="plus" strokeWidth={2.4} />
    </a>
  );
}

export function EditTodoButton({ todo, returnTo }: { todo: Todo; returnTo: string }) {
  return (
    <a
      href={addParam(returnTo, "edit", todo.id)}
      onClick={(event) => {
        event.preventDefault();
        dispatchOpen({ todo, returnTo });
      }}
    >
      Edit
    </a>
  );
}

export function TodoModal({
  initialTodo,
  initialOpen,
  initialReturnTo,
}: {
  initialTodo: Todo | null;
  initialOpen: boolean;
  initialReturnTo: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [editing, setEditing] = useState<Todo | null>(initialTodo);
  const [returnTo, setReturnTo] = useState(initialReturnTo);
  const titleRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<OpenDetail>).detail;

      if (!detail) {
        return;
      }

      setEditing(detail.todo);
      setReturnTo(detail.returnTo);
      setOpen(true);
    }

    window.addEventListener(OPEN_EVENT, onOpen);

    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => titleRef.current?.focus(), 40);

      return () => window.clearTimeout(timer);
    }
  }, [open, editing]);

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

    const params = new URLSearchParams(searchParams.toString());

    if (params.has("add") || params.has("edit")) {
      params.delete("add");
      params.delete("edit");
      const query = params.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop is-open"
      id="todo-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="todo-modal-title">
        <form action={saveTodo} className="modal-form">
          <input type="hidden" name="return_to" value={returnTo} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <h2 id="todo-modal-title">{editing ? "Edit Todo" : "Add Todo"}</h2>
          <p className="modal-sub">
            {editing
              ? "Update the details of this task."
              : "What would you like to get done?"}
          </p>

          <div key={editing?.id ?? "new"}>
            <label className="field">
              <span>Title</span>
              <input
                ref={titleRef}
                className="input"
                type="text"
                name="title"
                maxLength={200}
                required
                placeholder="e.g. Jogging"
                defaultValue={editing?.title ?? ""}
              />
            </label>

            <div className="time-row">
              <label className="field">
                <span>Start time</span>
                <input
                  className="input"
                  type="time"
                  name="start_time"
                  defaultValue={editing?.start_time?.slice(0, 5) ?? ""}
                />
              </label>

              <label className="field">
                <span>End time</span>
                <input
                  className="input"
                  type="time"
                  name="end_time"
                  defaultValue={editing?.end_time?.slice(0, 5) ?? ""}
                />
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? "Save Changes" : "Add Todo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
