"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { saveTodoInline } from "@/app/actions/todos";
import { Icon } from "@/components/icons";

const ADD_EVENT = "Scrum Master:todo:add";

function addParam(path: string): string {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}add=1`;
}

function dispatchAdd() {
  window.dispatchEvent(new CustomEvent(ADD_EVENT));
}

/** Header button — jumps to the inline composer instead of opening a dialog. */
export function AddTodoButton({ returnTo }: { returnTo: string }) {
  return (
    <a
      className="btn-add"
      href={addParam(returnTo)}
      onClick={(event) => {
        event.preventDefault();
        dispatchAdd();
      }}
    >
      <Icon name="plus" strokeWidth={2.4} />
      Add Todo
    </a>
  );
}

/** Phone floating action button — same behaviour as the header button. */
export function AddTodoFab({ returnTo }: { returnTo: string }) {
  return (
    <a
      className="fab"
      href={addParam(returnTo)}
      aria-label="Add todo"
      onClick={(event) => {
        event.preventDefault();
        dispatchAdd();
      }}
    >
      <Icon name="plus" strokeWidth={2.4} />
    </a>
  );
}

/**
 * The inline "Add task" composer at the bottom of the list — the ClickUp
 * pattern: type a title, press Enter, the row appears and the composer stays
 * open for the next one.
 */
export function AddTaskRow({
  returnTo,
  autoFocus = false,
}: {
  returnTo: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The header button and the FAB dispatch this.
  useEffect(() => {
    function onAdd() {
      setOpen(true);
    }

    window.addEventListener(ADD_EVENT, onAdd);

    return () => window.removeEventListener(ADD_EVENT, onAdd);
  }, []);

  // ?add=1 deep links open and focus the composer.
  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    setOpen(true);

    const timer = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ block: "center" });
      inputRef.current?.focus();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function submit() {
    const trimmed = title.trim();

    if (!trimmed) {
      setOpen(false);
      return;
    }

    const data = new FormData();
    data.set("title", trimmed);
    data.set("return_to", returnTo);

    startTransition(async () => {
      const result = await saveTodoInline(data);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setTitle("");
      // Stay open — add the next one — without letting focus yank the page
      // around; revealNewRow() brings the fresh row into view instead.
      inputRef.current?.focus({ preventScroll: true });

      if (result.id) {
        revealNewRow(result.id);
      }
    });
  }

  /**
   * The revalidated list lands right after the action resolves, so poll briefly
   * for the row we just created, then centre it (the composer sits directly
   * below it, so both end up on screen).
   */
  function revealNewRow(todoId: string) {
    const deadline = performance.now() + 1500;

    const attempt = () => {
      const row = document.querySelector<HTMLElement>(`[data-todo-id="${todoId}"]`);

      if (!row) {
        if (performance.now() < deadline) {
          window.requestAnimationFrame(attempt);
        } else {
          inputRef.current?.focus(); // fallback: at least show the composer
        }

        return;
      }

      const rowRect = row.getBoundingClientRect();
      const formRect = formRef.current?.getBoundingClientRect();
      const rowVisible = rowRect.top >= 0 && rowRect.bottom <= window.innerHeight;
      const formVisible =
        !!formRect && formRect.top >= 0 && formRect.bottom <= window.innerHeight;

      if (!rowVisible || !formVisible) {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
      }

      inputRef.current?.focus({ preventScroll: true });
    };

    window.requestAnimationFrame(attempt);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();

      if (title.trim()) {
        setTitle("");
      } else {
        setOpen(false);
      }
    }
  }

  if (!open) {
    return (
      <button type="button" className="add-task-placeholder" onClick={() => setOpen(true)}>
        <Icon name="plus" strokeWidth={2.4} />
        Add task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="add-task"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <span className="add-task-plus" aria-hidden="true">
        <Icon name="plus" strokeWidth={2.4} />
      </span>

      <input
        ref={inputRef}
        type="text"
        name="title"
        maxLength={200}
        value={title}
        placeholder="What needs doing? Press Enter to add"
        aria-label="New task"
        onChange={(event) => {
          setTitle(event.target.value);

          if (error) {
            setError(null);
          }
        }}
        onKeyDown={onKeyDown}
      />

      <button type="submit" className="btn-primary btn-small" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </button>

      <button
        type="button"
        className="add-task-cancel"
        aria-label="Close"
        onClick={() => {
          setTitle("");
          setError(null);
          setOpen(false);
        }}
      >
        ×
      </button>

      {error ? (
        <span className="row-error add-task-error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
