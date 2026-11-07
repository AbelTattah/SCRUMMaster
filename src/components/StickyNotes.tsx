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
 * the background), and any sync change re-renders the open view.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { decryptRows, subscribe, toggleTodoLocal, visibleHomeRows } from "@/lib/sync";
import type { TeamTodo } from "@/lib/types";

type PiPWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };
};

const NOTE_COLORS = ["c0", "c1", "c2", "c3", "c4"];

/* Self-contained styles: host documents inherit nothing from the app.
   One column, minimal info — checkbox, title, and the time when set. */
const STICKY_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    background: #F3EFE2;
    padding: 8px;
    min-height: 100vh;
  }
  .sticky-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 6px; margin-bottom: 6px;
  }
  .sticky-title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #6B5B1E;
  }
  .sticky-count { font-size: 11px; font-weight: 600; color: #8A7A3E; }
  .sticky-notes {
    display: grid;
    grid-template-columns: 1fr;
    gap: 7px;
    padding-bottom: 10px;
  }
  .sticky-note {
    padding: 7px 9px 8px;
    border-radius: 2px 2px 10px 2px;
    box-shadow: 0 3px 6px rgba(60, 50, 10, 0.2);
    color: #35321F;
    transform: rotate(-0.7deg);
  }
  .sticky-note:nth-child(2n) { transform: rotate(0.8deg); }
  .sticky-note:nth-child(3n) { transform: rotate(-0.4deg); }
  .sticky-note:nth-child(5n) { transform: rotate(0.5deg); }
  .sticky-note.c0 { background: #FFF3B0; }
  .sticky-note.c1 { background: #D6F7D0; }
  .sticky-note.c2 { background: #FFD9E4; }
  .sticky-note.c3 { background: #D6EBFF; }
  .sticky-note.c4 { background: #E9DDFF; }
  .sticky-note.done { opacity: 0.6; }
  .sticky-note.done .sticky-label { text-decoration: line-through; }
  .sticky-row { display: flex; gap: 7px; align-items: flex-start; }
  .sticky-check {
    width: 14px; height: 14px; margin-top: 1px; flex: none;
    accent-color: #3F7D32; cursor: pointer;
  }
  .sticky-label {
    font-size: 12.5px; font-weight: 600; line-height: 1.3;
    word-break: break-word;
  }
  .sticky-time {
    margin-top: 3px; font-size: 10px; font-weight: 700;
    color: #7C6C30; letter-spacing: 0.02em;
  }
  .sticky-empty {
    text-align: center; color: #8A8A6E;
    padding: 28px 8px; font-size: 12.5px;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #17151C; }
    .sticky-title { color: #E8D98F; }
    .sticky-count { color: #A99A5E; }
    .sticky-empty { color: #8B86A0; }
  }
`;

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

/** Draw the notes into any host document (idempotent — replaces content). */
function renderSticky(doc: Document, el: Element, todos: TeamTodo[]): void {
  el.textContent = "";

  const head = doc.createElement("div");
  head.className = "sticky-head";
  head.innerHTML = `<span class="sticky-title">Today's notes</span><span class="sticky-count"></span>`;
  el.appendChild(head);

  const remaining = todos.filter((todo) => !todo.completed).length;
  const count = head.querySelector(".sticky-count");
  if (count) {
    count.textContent =
      todos.length === 0
        ? "nothing yet"
        : `${remaining} of ${todos.length} to do`;
  }

  const grid = doc.createElement("div");
  grid.className = "sticky-notes";
  el.appendChild(grid);

  if (todos.length === 0) {
    const empty = doc.createElement("div");
    empty.className = "sticky-empty";
    empty.textContent = "Nothing here yet — add your first task.";
    grid.appendChild(empty);
    return;
  }

  todos.forEach((todo, index) => {
    const note = doc.createElement("div");
    note.className = `sticky-note ${NOTE_COLORS[index % NOTE_COLORS.length]}${
      todo.completed ? " done" : ""
    }`;

    const row = doc.createElement("label");
    row.className = "sticky-row";

    const check = doc.createElement("input");
    check.type = "checkbox";
    check.className = "sticky-check";
    check.checked = todo.completed;
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

    row.appendChild(check);
    row.appendChild(label);
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

    grid.appendChild(note);
  });
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
      const request = pip.requestWindow({ width: 300, height: 400 });

      const win = await Promise.race([
        request,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
      ]);

      if (win) {
        const style = win.document.createElement("style");
        style.textContent = STICKY_CSS;
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
    "popup=yes,width=310,height=420,menubar=no,toolbar=no,location=no,status=no",
  );

  if (popup?.document) {
    popup.document.open();
    popup.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Today — Scrum Master</title><style>${STICKY_CSS}</style></head><body><div id="sticky-root"></div></body></html>`,
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

    if (hostRef.current) {
      renderSticky(hostRef.current.doc, hostRef.current.el, todos);
    } else if (mode === "inline" && inlineRef.current) {
      ensureStickyStyle(document);
      renderSticky(document, inlineRef.current, todos);
    }
  }, [todos, mode]);

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
        title="Today's todos as sticky notes — opens automatically when you switch away"
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
