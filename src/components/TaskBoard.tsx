"use client";

/**
 * The task list — offline-first.
 *
 * Renders from the encrypted local mirror (decrypted at this boundary), not
 * from the server: rows appear the instant they change, with or without a
 * network, and search/tab filtering runs over decrypted text in the browser
 * (the server can no longer search ciphertext).
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AddTaskRow } from "@/components/AddTask";
import { TaskRow } from "@/components/TaskRow";
import {
  decryptRows,
  initSync,
  pullOwn,
  pullTeam,
  subscribe,
  visibleHomeRows,
  visibleTeamRows,
} from "@/lib/sync";
import type { Assignee, PageFilter, TeamTodo } from "@/lib/types";

interface TaskBoardProps {
  scope: "home" | "team";
  page: PageFilter;
  q: string;
  focusId: string;
  returnTo: string;
  members: Assignee[];
  currentUserId: string;
  canAssign: boolean;
  autoFocusAdd: boolean;
  /** Shown instead of the default empty-state line. */
  emptyHint?: ReactNode;
}

export function TaskBoard({
  scope,
  page,
  q,
  focusId,
  returnTo,
  members,
  currentUserId,
  canAssign,
  autoFocusAdd,
  emptyHint,
}: TaskBoardProps) {
  const [rows, setRows] = useState<TeamTodo[]>([]);
  const [booted, setBooted] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function reload() {
      const local = scope === "team" ? await visibleTeamRows() : await visibleHomeRows();
      const view = await decryptRows(local);

      if (alive) {
        setRows(view);
      }
    }

    const unsubscribe = subscribe(() => {
      void reload();
    });

    void (async () => {
      if (scope === "team") {
        await pullTeam();
      } else {
        await pullOwn();
      }

      await reload();

      if (alive) {
        setBooted(true);
      }
    })();

    function onSyncError(event: Event) {
      const message = (event as CustomEvent<string>).detail;
      setSyncError(message);
      window.setTimeout(() => setSyncError(null), 8000);
    }

    window.addEventListener("Scrum Master:sync-error", onSyncError);

    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener("Scrum Master:sync-error", onSyncError);
    };
  }, [scope]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (page === "completed" && !row.completed) {
          return false;
        }

        if (page === "in-progress" && row.completed) {
          return false;
        }

        if (needle && !row.title.toLowerCase().includes(needle)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [rows, page, q]);

  return (
    <>
      {syncError ? (
        <p className="row-error board-sync-error" role="alert">
          {syncError}
        </p>
      ) : null}

      {!booted ? <p className="empty">Loading your tasks…</p> : null}

      {booted && visible.length === 0 ? (
        <p className="empty">
          {q ? (
            <>No todos match &ldquo;{q}&rdquo;.</>
          ) : (
            (emptyHint ?? <>Nothing here yet — add your first task below.</>)
          )}
        </p>
      ) : null}

      {visible.map((todo) => (
        <TaskRow
          key={todo.id}
          todo={todo}
          returnTo={returnTo}
          variant={scope === "team" ? "team" : "home"}
          currentUserId={currentUserId}
          members={members}
          canAssign={canAssign}
          focus={focusId !== "" && todo.id === focusId}
        />
      ))}

      <AddTaskRow returnTo={returnTo} autoFocus={autoFocusAdd} />
    </>
  );
}

/** Re-exported so pages can initialise the viewer before the board mounts. */
export { initSync };
