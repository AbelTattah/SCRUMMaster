"use client";

/**
 * Picture-in-picture "sticky notes" view of today's board.
 *
 * One renderer, three hosts (best first):
 *   1. Document Picture-in-Picture — a real always-on-top mini window
 *   2. a small popup window (Electron / PiP unavailable)
 *   3. an inline floating panel in the app (popups blocked)
 *
 * Every host shows the local mirror's today list as sticky notes — ticking a
 * note runs the normal offline-first toggle (encrypted, queued, pushed in
 * the background), a pinned bar adds new tasks, any note edits inline
 * (title + start/end time), and every sync change re-renders the view.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import {
  createTodoLocal,
  decryptRows,
  saveTodoLocal,
  subscribe,
  toggleTodoLocal,
  visibleHomeRows,
} from "@/lib/sync";
import type { TeamTodo } from "@/lib/types";

type PiPWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };
};

const NOTE_COLORS = ["c0", "c1", "c2", "c3", "c4"];

/* Self-contained styles: every selector is scoped to .sticky-root, so the
   sheet can be injected into the app document (inline fallback) without
   touching the page around it. Short cards by design — checkbox, title,
   the time when set, an edit affordance — plus a pinned add-task bar. */
const STICKY_CSS = `
  .sticky-root *, .sticky-root *::before, .sticky-root *::after {
    box-sizing: border-box;
  }
  .sticky-root {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #35321F;
    background: #F3EFE2;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sticky-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 6px 3px;
  }
  .sticky-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 6px; margin-bottom: 4px;
  }
  .sticky-title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #6B5B1E;
  }
  .sticky-count { font-size: 11px; font-weight: 600; color: #8A7A3E; }
  .sticky-search {
    width: 100%; font: inherit; font-size: 11.5px;
    padding: 4px 7px; margin: 0 0 5px;
    border: 1px solid #D8CD9A; border-radius: 4px;
    background: #FFFDF3; color: #35321F; outline: none;
  }
  .sticky-search:focus { border-color: #B9A24A; }
  .sticky-search::placeholder { color: #9A8C52; }
  .sticky-notes { display: grid; grid-template-columns: 1fr; gap: 5px; }
  .sticky-note {
    position: relative;
    padding: 4px 7px 5px;
    border-radius: 2px 2px 8px 2px;
    box-shadow: 0 2px 4px rgba(60, 50, 10, 0.18);
    transform: rotate(-0.5deg);
    /* Pastel notes always use dark ink — keeps text readable in dark mode. */
    color: #35321F;
  }
  .sticky-note:nth-child(2n) { transform: rotate(0.6deg); }
  .sticky-note:nth-child(3n) { transform: rotate(-0.3deg); }
  .sticky-note:nth-child(5n) { transform: rotate(0.4deg); }
  .sticky-note.c0 { background: #FFF3B0; }
  .sticky-note.c1 { background: #D6F7D0; }
  .sticky-note.c2 { background: #FFD9E4; }
  .sticky-note.c3 { background: #D6EBFF; }
  .sticky-note.c4 { background: #E9DDFF; }
  .sticky-note.done { opacity: 0.6; }
  .sticky-note.done .sticky-label { text-decoration: line-through; }
  .sticky-row { display: flex; gap: 6px; align-items: flex-start; }
  .sticky-check {
    width: 13px; height: 13px; margin-top: 1px; flex: none;
    accent-color: #3F7D32; cursor: pointer;
  }
  .sticky-label {
    flex: 1 1 auto; min-width: 0;
    font-size: 12px; font-weight: 600; line-height: 1.25;
    word-break: break-word; cursor: text;
  }
  .sticky-edit-btn {
    flex: none; border: 0; background: transparent; padding: 0 1px;
    font: inherit; font-size: 11px; line-height: 1.25; color: #8A7A3E;
    opacity: 0.55; cursor: pointer;
  }
  .sticky-edit-btn:hover { opacity: 1; }
  .sticky-time {
    margin-top: 2px; font-size: 9.5px; font-weight: 700;
    color: #7C6C30; letter-spacing: 0.02em;
  }
  .sticky-edit {
    width: 100%; font: inherit; font-size: 12px; font-weight: 600;
    padding: 2px 4px; border: 1px solid #C9B970; border-radius: 3px;
    background: #FFFDF3; color: #35321F; outline: none;
  }
  .sticky-edit:focus { border-color: #9C8526; }
  .sticky-times { display: flex; gap: 5px; margin-top: 4px; }
  .sticky-times input {
    flex: 1 1 0; min-width: 0; font: inherit; font-size: 10.5px;
    padding: 1px 3px; border: 1px solid #D8CD9A; border-radius: 3px;
    background: #FFFDF3; color: #5C5224; outline: none;
  }
  .sticky-actions { display: flex; gap: 5px; margin-top: 5px; }
  .sticky-actions button {
    flex: 1 1 0; font: inherit; font-size: 11px; font-weight: 700;
    padding: 3px 0; border-radius: 3px; border: 1px solid transparent;
    cursor: pointer;
  }
  .sticky-save { background: #3F7D32; color: #FFFFFF; }
  .sticky-save:disabled { opacity: 0.7; cursor: default; }
  .sticky-cancel {
    background: transparent; border-color: #C9B970 !important; color: #7C6C30;
  }
  .sticky-msg { margin-top: 4px; font-size: 10.5px; font-weight: 700; color: #B23A2E; }
  .sticky-msg[hidden] { display: none; }
  .sticky-composer {
    flex: none; display: flex; flex-direction: column; gap: 4px;
    padding: 6px 6px 7px;
    border-top: 1px solid rgba(107, 91, 30, 0.18);
    background: rgba(255, 255, 255, 0.4);
  }
  .sticky-composer-row { display: flex; gap: 5px; align-items: center; }
  .sticky-new {
    flex: 1 1 auto; min-width: 0; font: inherit; font-size: 12px;
    padding: 5px 7px; border: 1px solid #D8CD9A; border-radius: 4px;
    background: #FFFDF3; color: #35321F; outline: none;
  }
  .sticky-new:focus { border-color: #B9A24A; }
  .sticky-add {
    flex: none; width: 26px; height: 26px; border: 0; border-radius: 4px;
    background: #3F7D32; color: #FFFFFF; font-size: 17px; font-weight: 700;
    line-height: 1; cursor: pointer;
  }
  .sticky-add:disabled { opacity: 0.7; cursor: default; }
  .sticky-empty {
    text-align: center; color: #8A8A6E;
    padding: 20px 8px; font-size: 12px;
  }
  @media (prefers-color-scheme: dark) {
    .sticky-root { background: #17151C; }
    .sticky-title { color: #E8D98F; }
    .sticky-count { color: #A99A5E; }
    .sticky-empty { color: #8B86A0; }
    .sticky-composer {
      background: rgba(255, 255, 255, 0.04);
      border-top-color: rgba(232, 217, 143, 0.18);
    }
    .sticky-new, .sticky-search {
      background: #211E2B; border-color: #3A3549; color: #EDEAF7;
    }
    .sticky-search::placeholder { color: #7A7494; }
    .sticky-msg { color: #FF9A8B; }
  }
`;

/** Host-only base styles — appended only to popup/PiP documents (the app
   document must never have its body/html restyled). */
const HOST_BASE_CSS = `html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }`;

interface Host {
  doc: Document;
  el: Element;
  /** Close popup/pip windows and listeners. */
  close: () => void;
  kind: "pip" | "popup";
}

async function loadToday(): Promise<TeamTodo[]> {
  const rows = await decryptRows(await visibleHomeRows());

  // Open work first, then the day's order — like clearing a corkboard.
  return rows.sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) || a.created_at.localeCompare(b.created_at),
  );
}

/** Refresh contract shared by every host: local writes re-pull the list. */
interface StickyHooks {
  /** Re-pull local data after a local write (re-renders the open view). */
  refresh: () => void;
}

/** Cancel-in-place handlers for notes currently showing an edit form. */
const restores = new WeakMap<Element, () => void>();

/** The note's resting content: checkbox, title (click to edit), time. */
function paintNoteBody(doc: Document, note: Element, todo: TeamTodo, hooks: StickyHooks): void {
  restores.delete(note);
  note.textContent = "";

  const row = doc.createElement("div");
  row.className = "sticky-row";

  const check = doc.createElement("input");
  check.type = "checkbox";
  check.className = "sticky-check";
  check.checked = todo.completed;
  check.setAttribute("aria-label", `Mark “${todo.title}” done`);
  check.addEventListener("change", () => {
    const next = check.checked;
    note.classList.toggle("done", next);
    // Normal offline-first path: encrypted local write + queued push.
    void toggleTodoLocal(todo.id, next).catch(() => {
      check.checked = !next;
      note.classList.toggle("done", !next);
    });
  });

  const label = doc.createElement("span");
  label.className = "sticky-label";
  label.textContent = todo.title;
  label.title = "Click to edit";
  label.addEventListener("click", () => startEdit(doc, note, todo, hooks));

  const editBtn = doc.createElement("button");
  editBtn.type = "button";
  editBtn.className = "sticky-edit-btn";
  editBtn.textContent = "✎";
  editBtn.title = "Edit task";
  editBtn.setAttribute("aria-label", `Edit “${todo.title}”`);
  editBtn.addEventListener("click", () => startEdit(doc, note, todo, hooks));

  row.append(check, label, editBtn);
  note.appendChild(row);

  const time = [todo.start_time, todo.end_time]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 5))
    .join(" – ");

  if (time) {
    const when = doc.createElement("div");
    when.className = "sticky-time";
    when.textContent = time;
    note.appendChild(when);
  }
}

/** Replace a note with an inline edit form (title + start/end time). */
function startEdit(doc: Document, note: Element, todo: TeamTodo, hooks: StickyHooks): void {
  // One form at a time: retire whichever note is already being edited.
  const open = note.closest(".sticky-root")?.querySelector(".sticky-edit");

  if (open) {
    const other = open.closest(".sticky-note");

    if (other === note) {
      (open as HTMLInputElement).focus();
      (open as HTMLInputElement).select();
      return;
    }

    if (other) {
      restores.get(other)?.();
    }
  }

  note.textContent = "";

  const title = doc.createElement("input");
  title.className = "sticky-edit";
  title.type = "text";
  title.maxLength = 200;
  title.value = todo.title;
  title.setAttribute("aria-label", "Task title");

  const times = doc.createElement("div");
  times.className = "sticky-times";

  const start = doc.createElement("input");
  start.type = "time";
  start.value = todo.start_time?.slice(0, 5) ?? "";
  start.setAttribute("aria-label", "Start time");

  const end = doc.createElement("input");
  end.type = "time";
  end.value = todo.end_time?.slice(0, 5) ?? "";
  end.setAttribute("aria-label", "End time");
  times.append(start, end);

  const msg = doc.createElement("div");
  msg.className = "sticky-msg";
  msg.hidden = true;

  const actions = doc.createElement("div");
  actions.className = "sticky-actions";

  const save = doc.createElement("button");
  save.type = "button";
  save.className = "sticky-save";
  save.textContent = "Save";

  const cancel = doc.createElement("button");
  cancel.type = "button";
  cancel.className = "sticky-cancel";
  cancel.textContent = "Cancel";
  actions.append(save, cancel);

  note.append(title, times, msg, actions);

  const restore = () => {
    paintNoteBody(doc, note, todo, hooks);
    hooks.refresh(); // the list may have moved on while the form was open
  };
  restores.set(note, restore);

  const commit = () => {
    const next = title.value.trim();

    if (!next) {
      msg.textContent = "Please enter a todo title.";
      msg.hidden = false;
      title.focus();
      return;
    }

    msg.hidden = true;
    save.disabled = true;

    void saveTodoLocal(todo.id, {
      title: next,
      start_time: start.value,
      end_time: end.value,
    })
      .then((result) => {
        if (result.error) {
          msg.textContent = result.error;
          msg.hidden = false;
          return;
        }
        // Land the edit immediately, then let refresh rebuild the list.
        paintNoteBody(
          doc,
          note,
          { ...todo, title: next, start_time: start.value, end_time: end.value },
          hooks,
        );
        hooks.refresh();
      })
      .finally(() => {
        save.disabled = false; // detached on success — harmless
      });
  };

  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      restore();
    }
  };

  title.addEventListener("keydown", keyDown);
  start.addEventListener("keydown", keyDown);
  end.addEventListener("keydown", keyDown);
  save.addEventListener("click", commit);
  cancel.addEventListener("click", restore);

  title.focus();
  title.select();
}

/** Pinned add-task bar — created once per host, survives every re-render. */
function ensureComposer(doc: Document, root: Element, hooks: StickyHooks): void {
  if (root.querySelector(".sticky-composer")) {
    return;
  }

  const bar = doc.createElement("div");
  bar.className = "sticky-composer";

  const row = doc.createElement("div");
  row.className = "sticky-composer-row";

  const input = doc.createElement("input");
  input.className = "sticky-new";
  input.type = "text";
  input.placeholder = "Add a task…";
  input.maxLength = 200;
  input.setAttribute("aria-label", "New task title");

  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = "sticky-add";
  btn.textContent = "+";
  btn.title = "Add task";
  btn.setAttribute("aria-label", "Add task");

  const msg = doc.createElement("div");
  msg.className = "sticky-msg";
  msg.hidden = true;

  row.append(input, btn);
  bar.append(row, msg);
  root.appendChild(bar);

  const submit = () => {
    const title = input.value.trim();

    if (!title) {
      input.focus();
      return;
    }

    msg.hidden = true;
    btn.disabled = true;

    void createTodoLocal({ title })
      .then((result) => {
        if (result.error) {
          msg.textContent = result.error;
          msg.hidden = false;
          return;
        }
        input.value = "";
        input.focus();
        hooks.refresh();
      })
      .finally(() => {
        btn.disabled = false;
      });
  };

  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  input.addEventListener("input", () => {
    msg.hidden = true;
  });
}

function drawGrid(
  doc: Document,
  grid: Element,
  todos: TeamTodo[],
  query: string,
  hooks: StickyHooks,
): void {
  grid.textContent = "";

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? todos.filter((todo) => todo.title.toLowerCase().includes(needle))
    : todos;

  if (shown.length === 0) {
    const empty = doc.createElement("div");
    empty.className = "sticky-empty";
    empty.textContent = todos.length === 0
      ? "Nothing here yet — add your first task."
      : "No tasks match your search.";
    grid.appendChild(empty);
    return;
  }

  shown.forEach((todo) => {
    // Keep a note's color stable across searches (tied to its position in the
    // full day list, not the filtered view).
    const index = todos.indexOf(todo);
    const note = doc.createElement("div");
    note.className = `sticky-note ${NOTE_COLORS[(index >= 0 ? index : 0) % NOTE_COLORS.length]}${
      todo.completed ? " done" : ""
    }`;
    paintNoteBody(doc, note, todo, hooks);
    grid.appendChild(note);
  });
}

/** Draw the notes into any host document (idempotent — replaces content). */
function renderSticky(doc: Document, el: Element, todos: TeamTodo[], hooks: StickyHooks): void {
  // A sync update must never blow away a form the user is typing in —
  // save/cancel refreshes the view instead.
  if (el.querySelector(".sticky-edit")) {
    return;
  }

  el.classList.add("sticky-root");

  let body = el.querySelector(".sticky-body");

  if (!body) {
    body = doc.createElement("div");
    body.className = "sticky-body";
    el.appendChild(body);
  }

  ensureComposer(doc, el, hooks);

  // Preserve the search query across re-renders (sync updates).
  const existingSearch = body.querySelector<HTMLInputElement>(".sticky-search");
  const query = existingSearch?.value ?? "";
  const searchFocused = !!existingSearch && doc.activeElement === existingSearch;
  const selStart = searchFocused ? existingSearch.selectionStart : null;
  const selEnd = searchFocused ? existingSearch.selectionEnd : null;

  body.textContent = "";

  const head = doc.createElement("div");
  head.className = "sticky-head";
  head.innerHTML = `<span class="sticky-title">Today's notes</span><span class="sticky-count"></span>`;
  body.appendChild(head);

  const remaining = todos.filter((todo) => !todo.completed).length;
  const count = head.querySelector(".sticky-count");
  if (count) {
    count.textContent =
      todos.length === 0
        ? "nothing yet"
        : `${remaining} of ${todos.length} to do`;
  }

  const search = doc.createElement("input");
  search.className = "sticky-search";
  search.type = "search";
  search.placeholder = "Search tasks…";
  search.value = query;
  search.setAttribute("aria-label", "Search today's tasks");
  body.appendChild(search);

  const grid = doc.createElement("div");
  grid.className = "sticky-notes";
  body.appendChild(grid);

  const redraw = () => {
    drawGrid(doc, grid, todos, search.value, hooks);
    // Keep the count reflecting the full list (context), not the filter.
  };

  search.addEventListener("input", redraw);
  redraw();

  if (searchFocused) {
    search.focus();
    if (selStart !== null && selEnd !== null) {
      try {
        search.setSelectionRange(selStart, selEnd);
      } catch {
        // search inputs in some hosts reject selection ranges
      }
    }
  }
}

/** The floating panel host reuses the same stylesheet in the app document. */
function ensureStickyStyle(doc: Document): void {
  if (doc.getElementById("sticky-notes-style")) {
    return;
  }

  const style = doc.createElement("style");
  style.id = "sticky-notes-style";
  style.textContent = STICKY_CSS;
  doc.head.appendChild(style);
}

async function openHost(): Promise<Host | null> {
  // 1) Document Picture-in-Picture — real always-on-top mini window.
  //    Some embedded/locked-down browsers expose the API but never resolve
  //    requestWindow(); race it against a timeout so the flow can never hang.
  const pip = (window as PiPWindow).documentPictureInPicture;

  if (pip?.requestWindow) {
    try {
      const request = pip.requestWindow({ width: 300, height: 340 });

      const win = await Promise.race([
        request,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
      ]);

      if (win) {
        const style = win.document.createElement("style");
        style.textContent = `${STICKY_CSS}\n${HOST_BASE_CSS}`;
        (win.document.head ?? win.document.documentElement).appendChild(style);
        const el = win.document.createElement("div");
        win.document.body.appendChild(el);
        win.document.title = "Today — Scrum Master";

        return {
          doc: win.document,
          el,
          kind: "pip",
          close: () => {
            try {
              win.close();
            } catch {
              // already gone
            }
          },
        };
      }

      // Timeout won the race: we've fallen through to another host, so
      // close the window if the API still resolves later (no leak).
      request
        .then((late) => {
          try {
            late.close();
          } catch {
            // already gone
          }
        })
        .catch(() => undefined);
    } catch {
      // PiP refused (policy/unsupported) — fall through to a popup.
    }
  }

  // 2) Small popup window (Electron spawns a native window here).
  const popup = window.open(
    "",
    "scrum-master-sticky",
    "popup=yes,width=310,height=360,menubar=no,toolbar=no,location=no,status=no",
  );

  if (popup?.document) {
    popup.document.open();
    popup.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Today — Scrum Master</title><style>${STICKY_CSS}\n${HOST_BASE_CSS}</style></head><body><div id="sticky-root"></div></body></html>`,
    );
    popup.document.close();
    const el = popup.document.getElementById("sticky-root");

    if (!el) {
      popup.close();
      return null;
    }

    return { doc: popup.document, el, kind: "popup", close: () => popup.close() };
  }

  return null;
}

export function StickyNotesButton() {
  const [mode, setMode] = useState<"closed" | "floating" | "inline">("closed");
  const [todos, setTodos] = useState<TeamTodo[] | null>(null);
  const hostRef = useRef<Host | null>(null);
  const inlineRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef(mode);
  const autoRef = useRef(false); // opened by the away-from-tab trigger
  const openingRef = useRef(false); // an open is already in flight

  modeRef.current = mode;

  const reload = useCallback(() => {
    void loadToday().then((rows) => setTodos(rows));
  }, []);

  // Load once mounted; re-render on every sync/local change while open.
  useEffect(() => {
    reload();
    return subscribe(reload);
  }, [reload]);

  // Push the current data into whichever host is open.
  useEffect(() => {
    if (!todos) {
      return;
    }

    const hooks: StickyHooks = { refresh: reload };

    if (hostRef.current) {
      renderSticky(hostRef.current.doc, hostRef.current.el, todos, hooks);
    } else if (mode === "inline" && inlineRef.current) {
      ensureStickyStyle(document);
      renderSticky(document, inlineRef.current, todos, hooks);
    }
  }, [todos, mode, reload]);

  // Any path back to "closed" clears the auto-opened flag (manual close,
  // the mini window's X, or the return-to-tab trigger below).
  useEffect(() => {
    if (mode === "closed") {
      autoRef.current = false;
    }
  }, [mode]);

  // Close hosts when leaving the page.
  useEffect(() => {
    return () => {
      hostRef.current?.close();
      hostRef.current = null;
    };
  }, []);

  /** Wire a floating host up: close detection + state + first render. */
  const attach = useCallback((host: Host) => {
    hostRef.current = host;

    // Closing the mini window (X / PiP dismiss) flips the button back.
    // The PiP window fires pagehide/unload for its initial about:blank
    // document ~10 ms after opening — only a real close (win.closed)
    // should flip the button back.
    const onHostClose = () => {
      const view = host.doc.defaultView;
      if (view && !view.closed) {
        return; // spurious initial unload — the window is still open
      }
      hostRef.current = null;
      setMode((current) => (current === "inline" ? current : "closed"));
    };

    host.doc.defaultView?.addEventListener("pagehide", onHostClose);
    host.doc.defaultView?.addEventListener("unload", onHostClose);
    setMode("floating");
  }, []);

  /** Open notes automatically when the user leaves the tab/window. */
  const openAuto = useCallback(async () => {
    if (modeRef.current !== "closed" || openingRef.current) {
      return;
    }
    openingRef.current = true;
    try {
      const host = await openHost();
      if (!host) {
        return; // no floating host (blocked popup) — inline would be invisible
      }
      // The user came back while the window was opening — don't flash it.
      if (!document.hidden && document.hasFocus()) {
        host.close();
        return;
      }
      autoRef.current = true;
      attach(host);
    } finally {
      openingRef.current = false;
    }
  }, [attach]);

  /** Back in the tab: retire notes that opened automatically. */
  const closeAuto = useCallback(() => {
    if (!autoRef.current || modeRef.current === "closed") {
      return;
    }
    autoRef.current = false;
    hostRef.current?.close();
    hostRef.current = null;
    setMode("closed");
  }, []);

  // Auto-activate on switching away (hidden tab, or the window losing
  // focus — the desktop case), retire when the user is back.
  useEffect(() => {
    const evaluate = () => {
      if (document.hidden || !document.hasFocus()) {
        void openAuto();
      } else {
        closeAuto();
      }
    };

    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("blur", evaluate);
    window.addEventListener("focus", evaluate);
    return () => {
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("blur", evaluate);
      window.removeEventListener("focus", evaluate);
    };
  }, [openAuto, closeAuto]);

  async function toggle() {
    if (mode !== "closed") {
      autoRef.current = false;
      hostRef.current?.close();
      hostRef.current = null;
      setMode("closed");
      return;
    }

    if (openingRef.current) {
      return;
    }
    openingRef.current = true;
    let host: Host | null = null;
    try {
      host = await openHost();
    } finally {
      openingRef.current = false;
    }

    if (host) {
      attach(host);
      return;
    }
    setMode("inline");
  }

  return (
    <>
      <button
        type="button"
        className={`btn-sticky${mode !== "closed" ? " is-active" : ""}`}
        onClick={() => void toggle()}
        title="Today's todos as sticky notes — add or edit tasks right in the mini window; opens automatically when you switch away"
        aria-pressed={mode !== "closed"}
      >
        <Icon name="sticky" />
        {mode === "closed" ? "Sticky notes" : "Close notes"}
      </button>

      {mode === "inline" ? (
        <aside className="sticky-float" role="dialog" aria-label="Today's sticky notes">
          <header className="sticky-float-bar">
            <span>Sticky notes</span>
            <button
              type="button"
              aria-label="Close sticky notes"
              onClick={() => setMode("closed")}
            >
              ×
            </button>
          </header>
          <div ref={inlineRef} />
        </aside>
      ) : null}
    </>
  );
}
