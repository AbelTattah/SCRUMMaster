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

const PAGE_SIZE = 20;

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
  const [localQ, setLocalQ] = useState("");
  const [listPage, setListPage] = useState(1);

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
    const needles = [q, localQ]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    return rows
      .filter((row) => {
        if (page === "completed" && !row.completed) {
          return false;
        }

        if (page === "in-progress" && row.completed) {
          return false;
        }

        if (needles.some((needle) => !row.title.toLowerCase().includes(needle))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [rows, page, q, localQ]);

  // Filters changed -> back to the first page.
  useEffect(() => {
    setListPage(1);
  }, [page, q, localQ]);

  // A focused row (deep-link) must land on a visible page.
  useEffect(() => {
    if (!focusId) {
      return;
    }

    const index = visible.findIndex((row) => row.id === focusId);

    if (index >= 0) {
      setListPage(Math.floor(index / PAGE_SIZE) + 1);
    }
  }, [focusId, visible]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (listPage !== safePage) {
      setListPage(safePage);
    }
  }, [listPage, safePage]);

  const searching = q.trim() || localQ.trim();

  return (
    <>
      {syncError ? (
        <p className="row-error board-sync-error" role="alert">
          {syncError}
        </p>
      ) : null}

      {booted ? (
        <div className="list-tools">
          <input
            className="list-search"
            type="search"
            placeholder="Search tasks…"
            value={localQ}
            onChange={(event) => setLocalQ(event.target.value)}
            aria-label="Search tasks"
          />
          {visible.length > 0 ? (
            <span className="list-count">
              {visible.length} task{visible.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}

      {!booted ? <p className="empty">Loading your tasks…</p> : null}

      {booted && visible.length === 0 ? (
        <p className="empty">
          {searching ? (
            <>No todos match &ldquo;{(localQ || q).trim()}&rdquo;.</>
          ) : (
            (emptyHint ?? <>Nothing here yet — add your first task below.</>)
          )}
        </p>
      ) : null}

      {paged.map((todo) => (
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

      {totalPages > 1 ? (
        <nav className="pager" aria-label="Tasks pages">
          <button
            type="button"
            className="pager-btn"
            onClick={() => setListPage((value) => Math.max(1, value - 1))}
            disabled={safePage <= 1}
          >
            Prev
          </button>
          <span className="pager-status">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="pager-btn"
            onClick={() => setListPage((value) => Math.min(totalPages, value + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </nav>
      ) : null}

      <AddTaskRow returnTo={returnTo} autoFocus={autoFocusAdd} />
    </>
  );
}

/** Re-exported so pages can initialise the viewer before the board mounts. */
export { initSync };
