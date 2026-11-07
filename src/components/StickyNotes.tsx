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

/* Self-contained styles: host documents inherit nothing from the app. */
const STICKY_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    background: #F3EFE2;
    padding: 12px;
    min-height: 100vh;
  }
  .sticky-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 8px; margin-bottom: 10px;
  }
  .sticky-title {
    font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #6B5B1E;
  }
  .sticky-count { font-size: 12px; font-weight: 600; color: #8A7A3E; }
  .sticky-notes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding-bottom: 16px;
  }
  .sticky-note {
    padding: 12px 12px 14px;
    border-radius: 2px 2px 16px 2px;
    box-shadow: 0 4px 8px rgba(60, 50, 10, 0.22);
    color: #35321F;
    transform: rotate(-1.2deg);
    min-height: 74px;
  }
  .sticky-note:nth-child(2n) { transform: rotate(1.5deg); }
  .sticky-note:nth-child(3n) { transform: rotate(-0.5deg); }
  .sticky-note:nth-child(5n) { transform: rotate(0.9deg); }
  .sticky-note.c0 { background: #FFF3B0; }
  .sticky-note.c1 { background: #D6F7D0; }
  .sticky-note.c2 { background: #FFD9E4; }
  .sticky-note.c3 { background: #D6EBFF; }
  .sticky-note.c4 { background: #E9DDFF; }
  .sticky-note.done { opacity: 0.62; }
  .sticky-note.done .sticky-label { text-decoration: line-through; }
  .sticky-row { display: flex; gap: 9px; align-items: flex-start; }
  .sticky-check {
    width: 16px; height: 16px; margin-top: 1px; flex: none;
    accent-color: #3F7D32; cursor: pointer;
  }
  .sticky-label {
    font-size: 13.5px; font-weight: 600; line-height: 1.35;
    word-break: break-word;
  }
  .sticky-time {
    margin-top: 8px; font-size: 11px; font-weight: 700;
    color: #7C6C30; letter-spacing: 0.02em;
  }
  .sticky-empty {
    grid-column: 1 / -1; text-align: center; color: #8A8A6E;
    padding: 48px 12px; font-size: 14px;
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
      const request = pip.requestWindow({ width: 380, height: 520 });

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
    "popup=yes,width=390,height=540,menubar=no,toolbar=no,location=no,status=no",
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

  // Close hosts when leaving the page.
  useEffect(() => {
    return () => {
      hostRef.current?.close();
      hostRef.current = null;
    };
  }, []);

  async function toggle() {
    if (mode !== "closed") {
      hostRef.current?.close();
      hostRef.current = null;
      setMode("closed");
      return;
    }

    const host = await openHost();

    if (host) {
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
      if (todos) {
        renderSticky(host.doc, host.el, todos);
      }
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
        title="Show today's todos as sticky notes in a floating window"
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
