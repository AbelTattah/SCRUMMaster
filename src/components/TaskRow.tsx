"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { deleteTodo, saveTodoInline, setBlockerInline } from "@/app/actions/todos";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { TodoToggle } from "@/components/TodoToggle";
import { formatTimeRange } from "@/lib/time";
import type { Assignee, TeamTodo, Todo } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

type RowTodo = Todo &
  Partial<Pick<TeamTodo, "owner_name" | "owner_avatar" | "assignee_name" | "assignee_avatar">>;

interface Props {
  todo: RowTodo;
  returnTo: string;
  /** "team" rows always belong to the organization owner's management rights. */
  variant: "home" | "team";
  currentUserId: string;
  /** Everyone in the organization — used to label and pick assignees. */
  members: Assignee[];
  /** The viewer may re-assign (organization owner). */
  canAssign: boolean;
  /** A notification deep-link opened this row: scroll to it and start editing. */
  focus?: boolean;
}

/**
 * One task, edited in place — ClickUp style. The title, the time range, the
 * assignee and the blocker are all edited inside the row; there is no dialog
 * anywhere in the task flow. Only the delete confirmation still uses one.
 */
export function TaskRow({
  todo,
  returnTo,
  variant,
  currentUserId,
  members,
  canAssign,
  focus = false,
}: Props) {
  const canManage = variant === "team" || todo.user_id === currentUserId;

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [editingTitle, setEditingTitle] = useState(false);

  const [editingTime, setEditingTime] = useState(false);
  const [start, setStart] = useState(todo.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(todo.end_time?.slice(0, 5) ?? "");

  const [editingAssignee, setEditingAssignee] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState(todo.assignee_id ?? "");

  const [editingBlocker, setEditingBlocker] = useState(false);
  const [blockerDraft, setBlockerDraft] = useState(todo.blocker ?? "");

  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // A notification deep-link (?edit=<id>) lands here: centre the row and put
  // the caret straight into the title.
  useEffect(() => {
    if (!focus) {
      return;
    }

    rootRef.current?.scrollIntoView({ block: "center" });

    if (canManage) {
      const timer = window.setTimeout(() => {
        setTitleDraft(todo.title);
        setEditingTitle(true);
      }, 250);

      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    if (editingTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [editingTitle]);

  function save(
    fields: { title?: string; start_time?: string; end_time?: string; assignee?: string },
    after?: () => void,
  ) {
    const data = new FormData();
    data.set("id", todo.id);
    data.set("title", fields.title ?? todo.title);
    data.set("start_time", fields.start_time ?? todo.start_time?.slice(0, 5) ?? "");
    data.set("end_time", fields.end_time ?? todo.end_time?.slice(0, 5) ?? "");
    data.set("assignee", fields.assignee ?? todo.assignee_id ?? "");

    startTransition(async () => {
      const result = await saveTodoInline(data);

      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        after?.();
      }
    });
  }

  function commitTitle() {
    const draft = titleDraft.trim();
    setEditingTitle(false);

    if (!draft || draft === todo.title) {
      return;
    }

    save({ title: draft });
  }

  function titleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTitle();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditingTitle(false);
    }
  }

  function openTimeEditor() {
    if (!canManage) {
      return;
    }

    setStart(todo.start_time?.slice(0, 5) ?? "");
    setEnd(todo.end_time?.slice(0, 5) ?? "");
    setEditingTime(true);
  }

  function timeKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditingTime(false);
    }
  }

  function openAssignee() {
    if (!canAssign || !canManage) {
      return;
    }

    setAssigneeDraft(todo.assignee_id ?? "");
    setEditingAssignee(true);
  }

  function commitAssignee(value: string) {
    setEditingAssignee(false);
    setAssigneeDraft(value);

    if (value === (todo.assignee_id ?? "")) {
      return;
    }

    save({ assignee: value });
  }

  function openBlocker() {
    setBlockerDraft(todo.blocker ?? "");
    setEditingBlocker(true);
  }

  function saveBlocker() {
    const data = new FormData();
    data.set("id", todo.id);
    data.set("blocker", blockerDraft.trim());

    startTransition(async () => {
      const result = await setBlockerInline(data);

      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditingBlocker(false);
      }
    });
  }

  function blockerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditingBlocker(false);
    }
  }

  const range = formatTimeRange(todo.start_time, todo.end_time);
  const assignee = todo.assignee_id
    ? (members.find((member) => member.id === todo.assignee_id) ?? null)
    : null;
  const assigneeLabel = assignee
    ? assignee.id === currentUserId
      ? "You"
      : assignee.name
    : null;

  const expanded = editingBlocker || error !== null;

  const timeEditor = (
    <span className="inline-times" onKeyDown={timeKeyDown}>
      <input
        type="time"
        value={start}
        aria-label="Start time"
        onChange={(event) => {
          setStart(event.target.value);
          save({ start_time: event.target.value, end_time: end });
        }}
      />
      <span aria-hidden="true">–</span>
      <input
        type="time"
        value={end}
        aria-label="End time"
        onChange={(event) => {
          setEnd(event.target.value);
          save({ start_time: start, end_time: event.target.value });
        }}
      />
      <button
        type="button"
        className="inline-done"
        onClick={() => setEditingTime(false)}
      >
        Done
      </button>
    </span>
  );

  const timeDisplay = range ? (
    <>
      <Icon name="clock" />
      <span>{range}</span>
    </>
  ) : (
    <span className="todo-time-empty">
      {canManage ? "Add time" : "No time"}
    </span>
  );

  return (
    <div
      ref={rootRef}
      className={`todo-item${variant === "team" ? " team-row" : ""}${expanded ? " is-expanded" : ""}`}
    >
      <TodoToggle todoId={todo.id} completed={todo.completed} title={todo.title} />

      <div className="todo-main">
        <div className="todo-line">
          {editingTitle ? (
            <input
              ref={titleRef}
              className="inline-title"
              type="text"
              name="title"
              value={titleDraft}
              maxLength={200}
              aria-label="Task title"
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={titleKeyDown}
            />
          ) : (
            <span
              className={`todo-title${canManage ? " is-clickable" : ""}`}
              title={canManage ? "Click to rename" : undefined}
              onClick={
                canManage
                  ? () => {
                      setTitleDraft(todo.title);
                      setEditingTitle(true);
                    }
                  : undefined
              }
            >
              {todo.title}
            </span>
          )}

          <span className="todo-tags">
            {editingAssignee ? (
              <select
                className="inline-select"
                value={assigneeDraft}
                aria-label="Assign to"
                autoFocus
                onChange={(event) => commitAssignee(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setEditingAssignee(false);
                  }
                }}
              >
                <option value="">Nobody yet</option>
                {members
                  .filter((member) => member.id !== currentUserId)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            ) : assignee ? (
              <button
                type="button"
                className={`chip chip--assignee${canAssign && canManage ? " chip--action" : ""}`}
                disabled={!canAssign || !canManage}
                title={canAssign ? "Click to re-assign" : `Assigned to ${assignee.name}`}
                onClick={openAssignee}
              >
                <img src={avatarUrl(assignee.avatar_url)} alt="" />
                <span>{assigneeLabel}</span>
              </button>
            ) : canAssign && canManage ? (
              <button type="button" className="chip-assign" onClick={openAssignee}>
                + Assign
              </button>
            ) : null}

            {todo.blocker && !editingBlocker ? (
              <button
                type="button"
                className="todo-blocker"
                title={`${todo.blocker} — click to edit`}
                onClick={openBlocker}
              >
                Blocked
              </button>
            ) : null}
          </span>

          {variant === "home" ? (
            editingTime ? (
              timeEditor
            ) : (
              <button
                type="button"
                className="todo-time todo-time--action"
                title={canManage ? "Click to edit the time range" : undefined}
                onClick={openTimeEditor}
              >
                {timeDisplay}
              </button>
            )
          ) : (
            <span className="todo-meta">
              <span className="todo-owner">
                <img src={avatarUrl(todo.owner_avatar)} alt="" />
                {todo.owner_name}
              </span>

              {editingTime ? (
                timeEditor
              ) : (
                <button
                  type="button"
                  className="todo-time todo-time--action"
                  title={canManage ? "Click to edit the time range" : undefined}
                  onClick={openTimeEditor}
                >
                  {timeDisplay}
                </button>
              )}
            </span>
          )}

          <details className="kebab">
            <summary aria-label="Task actions">
              <Icon name="kebab" fill="currentColor" />
            </summary>

            <div className="kebab-menu">
              {todo.completed ? null : (
                <a
                  href="#blocker"
                  onClick={(event) => {
                    event.preventDefault();
                    openBlocker();
                  }}
                >
                  {todo.blocker ? "Edit blocker" : "Blocker"}
                </a>
              )}

              {canManage ? (
                <ConfirmForm
                  action={deleteTodo}
                  confirmTitle="Delete task?"
                  confirmMessage={`Delete “${todo.title}”? This cannot be undone.`}
                  confirmLabel="Delete"
                >
                  <input type="hidden" name="id" value={todo.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button type="submit" className="danger">
                    Delete
                  </button>
                </ConfirmForm>
              ) : null}
            </div>
          </details>
        </div>

        {editingBlocker ? (
          <div className="blocker-editor">
            <textarea
              value={blockerDraft}
              rows={2}
              maxLength={500}
              autoFocus
              aria-label="Blocker"
              placeholder="What is stopping this task? Leave empty to clear it."
              onChange={(event) => setBlockerDraft(event.target.value)}
              onKeyDown={blockerKeyDown}
            />
            <div className="blocker-editor-actions">
              <button
                type="button"
                className="blocker-clear"
                disabled={pending || !todo.blocker}
                onClick={() => {
                  const data = new FormData();
                  data.set("id", todo.id);
                  data.set("blocker", "");

                  startTransition(async () => {
                    const result = await setBlockerInline(data);

                    if (result.error) {
                      setError(result.error);
                    } else {
                      setError(null);
                      setBlockerDraft("");
                      setEditingBlocker(false);
                    }
                  });
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="blocker-cancel"
                onClick={() => setEditingBlocker(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="blocker-save"
                disabled={pending}
                onClick={saveBlocker}
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <span className="row-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
