/**
 * Offline-first sync: the UI writes here, never to the network directly.
 *
 *   mutate → encrypt → local IndexedDB (instant, offline-safe) → outbox
 *   flush  → pushTodos (ciphertext) when a network is available
 *   pull   → server rows back into the mirror (server wins only where the
 *            device has no pending local change)
 *
 * Decryption happens only at the render boundary (decryptRows) — the local
 * store itself keeps ciphertext at rest.
 */
import { loadTeamTodosSync, loadTodosSync, pushTodos, type PushOp } from "@/app/actions/sync";
import { loadSprintsSync, createSprintAction, updateSprintStatusAction, assignTodoToSprintAction } from "@/app/actions/sprints";
import { decryptField, encryptField, isEncrypted, UNREADABLE } from "@/lib/crypto";
import {
  allTodos,
  clearOps,
  enqueueOp,
  getMeta,
  getTodo,
  localdb,
  pendingOps,
  dropOp,
  putTodos,
  setMeta,
  type LocalTodo,
} from "@/lib/localdb";
import { contentKey, grantPendingMembers, keys } from "@/lib/keys";
import type { TeamTodo, Sprint } from "@/lib/types";

export interface InlineResult {
  error: string | null;
  /** Set when a row was created — lets the composer scroll it into view. */
  id?: string | null;
}

export interface SyncViewer {
  id: string;
  name: string;
  isOwner: boolean;
  inOrg: boolean;
}

let viewer: SyncViewer | null = null;
let started = false;
let flushing = false;
const listeners = new Set<() => void>();

/* ------------------------------------------------------------ plumbing */

export function initSync(next: SyncViewer): void {
  viewer = next;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function emitSyncError(message: string): void {
  void setMeta("sync_error", message);
  window.dispatchEvent(new CustomEvent("Scrum Master:sync-error", { detail: message }));
}

/**
 * Guest mode renders the shell without the CryptoGate, so nothing seeds the
 * sync viewer before list components mount. Seed a local-only viewer lazily
 * on first use when the guest flag is present.
 */
function guestViewer(): boolean {
  // A real viewer already seeded by CryptoGate always wins (e.g. a stale
  // guest cookie must never downgrade a signed-in session).
  if (viewer) {
    return viewer.id === "guest";
  }

  if (
    typeof document !== "undefined" &&
    (document.cookie.includes("scrum-guest=1") ||
      (() => {
        try {
          return localStorage.getItem("scrum-guest") === "1";
        } catch {
          return false;
        }
      })())
  ) {
    initSync({ id: "guest", name: "Guest", isOwner: false, inOrg: false });
    return true;
  }

  return false;
}

async function viewerOrFail(): Promise<SyncViewer> {
  if (!viewer) {
    guestViewer();
  }

  if (!viewer) {
    throw new Error("Sync is not initialised.");
  }

  return viewer;
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------ decryption */

/** Decrypt one stored task field (envelope → key → legacy passthrough). */
export async function decryptText(value: string | null | undefined): Promise<string> {
  if (!value) {
    return "";
  }

  if (!isEncrypted(value)) {
    return value; // legacy plaintext row
  }

  const session = keys();

  if (!session) {
    return UNREADABLE;
  }

  const first = await decryptField(session.orgKey ?? session.dek, value);

  if (first !== UNREADABLE) {
    return first;
  }

  if (session.orgKey) {
    // Written while the account was personal (or before a grant arrived).
    return decryptField(session.dek, value);
  }

  return UNREADABLE;
}

/** The mirror, decrypted — what every list renders. */
export async function decryptRows(rows: LocalTodo[]): Promise<TeamTodo[]> {  const out: TeamTodo[] = [];

  for (const row of rows) {
    out.push({
      id: row.id,
      user_id: row.user_id,
      title: await decryptText(row.title),
      completed: row.completed,
      start_time: row.start_time,
      end_time: row.end_time,
      assignee_id: row.assignee_id,
      sprint_id: row.sprint_id ?? null,
      story_points: row.story_points ?? null,
      blocker: row.blocker ? await decryptText(row.blocker) : null,
      legacy_id: row.legacy_id,
      created_at: row.created_at,
      owner_name: row.owner_name,
      owner_avatar: row.owner_avatar,
      assignee_name: row.assignee_name,
      assignee_avatar: row.assignee_avatar,
    });
  }

  return out;
}

/** Home list: rows this user can see (their own + assigned to them). */
export async function visibleHomeRows(): Promise<LocalTodo[]> {
  const me = await viewerOrFail();
  const rows = await allTodos();

  return rows.filter(
    (row) => !row.tombstone && (row.user_id === me.id || row.assignee_id === me.id),
  );
}

/** Team list: the ids the last team pull delivered (owner view). */
export async function visibleTeamRows(): Promise<LocalTodo[]> {
  const teamIds = (await getMeta<string[]>("team_ids")) ?? [];
  const wanted = new Set(teamIds);
  const rows = await allTodos();

  return rows.filter((row) => !row.tombstone && wanted.has(row.id));
}

/* ----------------------------------------------------------- local writes */

async function applyUpsert(
  id: string,
  state: {
    title?: string;
    start_time?: string | null;
    end_time?: string | null;
    assignee_id?: string | null;
    blocker?: string | null;
    completed?: boolean;
    sprint_id?: string | null;
    story_points?: number | null;
  },
  display?: { assignee_name?: string | null; assignee_avatar?: string | null },
): Promise<LocalTodo> {
  const me = await viewerOrFail();
  const existing = await getTodo(id);

  const row: LocalTodo = {
    id,
    user_id: existing?.user_id ?? me.id,
    title: state.title ?? existing?.title ?? "",
    blocker: state.blocker !== undefined ? state.blocker : (existing?.blocker ?? null),
    completed: state.completed ?? existing?.completed ?? false,
    start_time: state.start_time !== undefined ? state.start_time : (existing?.start_time ?? null),
    end_time: state.end_time !== undefined ? state.end_time : (existing?.end_time ?? null),
    assignee_id: state.assignee_id !== undefined ? state.assignee_id : (existing?.assignee_id ?? null),
    sprint_id: state.sprint_id !== undefined ? state.sprint_id : (existing?.sprint_id ?? null),
    story_points: state.story_points !== undefined ? state.story_points : (existing?.story_points ?? null),
    legacy_id: existing?.legacy_id ?? null,
    created_at: existing?.created_at ?? nowIso(),
    owner_name: existing?.owner_name ?? me.name,
    owner_avatar: existing?.owner_avatar ?? null,
    assignee_name:
      display?.assignee_name !== undefined
        ? display.assignee_name
        : (existing?.assignee_name ?? null),
    assignee_avatar:
      display?.assignee_avatar !== undefined
        ? display.assignee_avatar
        : (existing?.assignee_avatar ?? null),
    scope: existing?.scope ?? "own",
    dirty: 1,
    tombstone: 0,
    local_updated: Date.now(),
  };

  await putTodos([row]);
  await enqueueOp({
    kind: "upsert",
    todo_id: id,
    created_at: Date.now(),
  });

  notify();

  return row;
}

function pushOpFor(row: LocalTodo): PushOp {
  return {
    kind: "upsert",
    id: row.id,
    title: row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    assignee_id: row.assignee_id,
    blocker: row.blocker,
    completed: row.completed,
    sprint_id: row.sprint_id,
    story_points: row.story_points,
  };
}

/** Create a task: encrypt → mirror → outbox. Returns the new id at once. */
export async function createTodoLocal(draft: {
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  assignee_id?: string | null;
}): Promise<InlineResult> {
  const title = draft.title.trim();

  if (title.length === 0 || title.length > 200) {
    return { error: "Please enter a todo title." };
  }

  const key = contentKey();

  const isGuest = guestViewer();

  if (!key && !isGuest) {
    return { error: "The app is locked - unlock it to add tasks." };
  }

  const id = crypto.randomUUID();
  const storedTitle = isGuest ? title : await encryptField(key!, title);

  await applyUpsert(
    id,
    {
      title: storedTitle,
      start_time: draft.start_time ?? null,
      end_time: draft.end_time ?? null,
      assignee_id: draft.assignee_id ?? null,
      blocker: null,
      completed: false,
      sprint_id: null,
    },
    { assignee_name: null, assignee_avatar: null },
  );

  if (!isGuest) {
    await flush();
  } else {
    notify();
  }

  return { error: null, id };
}

/** Save a task's identity (title, times, assignee) from an inline editor. */
export async function saveTodoLocal(
  id: string,
  draft: {
    title: string;
    start_time?: string | null;
    end_time?: string | null;
    assignee_id?: string | null;
    assignee_name?: string | null;
    assignee_avatar?: string | null;
  },
): Promise<InlineResult> {
  const title = draft.title.trim();

  if (title.length === 0 || title.length > 200) {
    return { error: "Please enter a todo title." };
  }

  const key = contentKey();

  const isGuest = guestViewer();

  if (!key && !isGuest) {
    return { error: "The app is locked." };
  }

  const existing = await getTodo(id);

  if (!existing) {
    return { error: "That todo no longer exists." };
  }

  const storedTitle = isGuest ? title : await encryptField(key!, title);

  await applyUpsert(
    id,
    {
      title: storedTitle,
      start_time: draft.start_time !== undefined ? draft.start_time : existing.start_time,
      end_time: draft.end_time !== undefined ? draft.end_time : existing.end_time,
      assignee_id: draft.assignee_id !== undefined ? draft.assignee_id : existing.assignee_id,
      blocker: existing.blocker,
      completed: existing.completed,
    },
    {
      assignee_name:
        draft.assignee_name !== undefined ? draft.assignee_name : existing.assignee_name,
      assignee_avatar:
        draft.assignee_avatar !== undefined ? draft.assignee_avatar : existing.assignee_avatar,
    },
  );

  if (!isGuest) {
    await flush();
  } else {
    notify();
  }

  return { error: null, id };
}

/** Record (or clear) a blocker. */
export async function setBlockerLocal(id: string, blocker: string): Promise<InlineResult> {
  const note = blocker.trim().slice(0, 500);
  const existing = await getTodo(id);

  if (!existing) {
    return { error: "That todo no longer exists." };
  }

  const key = contentKey();
  const isGuest = guestViewer();

  if (!key && note && !isGuest) {
    return { error: "The app is locked." };
  }

  const storedBlocker =
    !note ? null : isGuest ? note : await encryptField(key!, note);

  await applyUpsert(id, {
    title: existing.title,
    blocker: storedBlocker,
    completed: existing.completed,
    start_time: existing.start_time,
    end_time: existing.end_time,
    assignee_id: existing.assignee_id,
  });

  if (!isGuest) {
    await flush();
  } else {
    notify();
  }

  return { error: null };
}

/** Tick a task off (or back on) — full-state so the push is idempotent. */
export async function toggleTodoLocal(id: string, completed: boolean): Promise<InlineResult> {
  const existing = await getTodo(id);

  if (!existing) {
    return { error: "That todo no longer exists." };
  }

  await applyUpsert(id, {
    title: existing.title,
    // Finishing a task clears its blocker — nothing is in the way anymore.
    blocker: completed ? null : existing.blocker,
    completed,
    start_time: existing.start_time,
    end_time: existing.end_time,
    assignee_id: existing.assignee_id,
  });
  await flush();

  return { error: null };
}

/** Delete a task locally; the tombstone goes away when the server confirms. */
export async function deleteTodoLocal(id: string): Promise<InlineResult> {
  const existing = await getTodo(id);

  if (!existing) {
    return { error: null };
  }

  await localdb.todos.update(id, { tombstone: 1, dirty: 1, local_updated: Date.now() });
  await enqueueOp({ kind: "delete", todo_id: id, created_at: Date.now() });
  notify();
  void flush();

  return { error: null };
}

/* --------------------------------------------------------------- pulling */

function toLocal(
  incoming: TeamTodo,
  scope: "own" | "team",
  previous?: LocalTodo,
): LocalTodo {
  return {
    id: incoming.id,
    user_id: incoming.user_id,
    title: incoming.title,
    blocker: incoming.blocker,
    completed: incoming.completed,
    start_time: incoming.start_time,
    end_time: incoming.end_time,
    assignee_id: incoming.assignee_id,
    sprint_id: incoming.sprint_id ?? null,
    story_points: incoming.story_points ?? null,
    legacy_id: incoming.legacy_id ?? null,
    created_at: incoming.created_at,
    owner_name: incoming.owner_name,
    owner_avatar: incoming.owner_avatar,
    assignee_name: incoming.assignee_name,
    assignee_avatar: incoming.assignee_avatar,
    scope: previous?.scope ?? scope,
    // A device with pending writes keeps its own version until it pushes.
    dirty: previous?.dirty ?? 0,
    tombstone: previous?.tombstone ?? 0,
    local_updated: previous?.local_updated ?? 0,
  };
}

async function mergeIncoming(
  incoming: TeamTodo[],
  scope: "own" | "team",
  wasMember: (row: LocalTodo) => boolean,
  pullStartedAt: number,
): Promise<void> {
  const existing = new Map((await allTodos()).map((row) => [row.id, row]));
  const incomingIds = new Set(incoming.map((row) => row.id));
  const keep: LocalTodo[] = [];

  for (const row of incoming) {
    const previous = existing.get(row.id);

    if (previous?.dirty || previous?.tombstone) {
      continue; // local changes win until they are pushed
    }

    // A pull that started before a local write can carry pre-write server
    // data — applying it would revert the change the user just made (the
    // task "coming back" after it was checked). Local writes that began
    // after this pull started always win.
    if (previous && previous.local_updated > pullStartedAt) {
      continue;
    }

    keep.push(toLocal(row, scope, previous));
  }

  await putTodos(keep);

  // Rows this pull is responsible for that the server no longer serves are
  // deleted locally - but only when the device has nothing pending and no
  // fresh local write. Rows from the other scope (home vs team) are left alone.
  // Safety: never wipe the whole local mirror from a single empty pull (could
  // be a transient auth/RLS/network hiccup) - preserve local data instead.
  const gone = incoming.length === 0
    ? []
    : [...existing.values()].filter(
        (row) =>
          wasMember(row) &&
          !incomingIds.has(row.id) &&
          !row.dirty &&
          !row.tombstone &&
          !(row.local_updated > pullStartedAt),
      );

  if (gone.length > 0) {
    await localdb.todos.bulkDelete(gone.map((row) => row.id));
  }

  notify();
}

/** Refresh the home mirror from the server. No-op while offline. */
export async function pullOwn(): Promise<void> {
  // Guest mode is local-only: a server call here would redirect the guest
  // straight to the sign-in screen.
  if (guestViewer()) {
    return;
  }

  // Captured before the fetch: any local write that starts while the pull is
  // in flight is newer than the server snapshot we are about to receive.
  const startedAt = Date.now();

  try {
    const rows = await loadTodosSync();
    const me = viewer?.id;

    await mergeIncoming(
      rows,
      "own",
      (row) => Boolean(me) && (row.user_id === me || row.assignee_id === me),
      startedAt,
    );
    void migrateLegacyRows();
  } catch {
    // offline (or signed out) — the mirror keeps serving the last sync
  }
}

/** Pull sprints from the server into the local mirror. */
export async function pullSprints(): Promise<void> {
  // Guest mode is local-only: a server call here would redirect the guest
  // straight to the sign-in screen.
  if (guestViewer()) {
    return;
  }

  try {
    const rows = await loadSprintsSync();
    if (rows.length === 0) {
      return;
    }
    await localdb.sprints.bulkPut(rows as any);
    notify();
  } catch {
    // offline
  }
}

/** Create a sprint locally first so it works offline, then sync when possible. */
export async function createSprintLocal(name: string, goal: string | null, startDate: string, endDate: string): Promise<Sprint | null> {
  // Always create locally so sprints work offline (e.g. guest mode on desktop).
  const local: Sprint = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `sprint-${Date.now()}`,
    user_id: viewer?.id ?? "guest",
    name,
    goal,
    start_date: startDate,
    end_date: endDate,
    status: "planned",
    created_at: new Date().toISOString(),
  };

  await localdb.sprints.put(local as any);
  notify();

  // Best-effort server sync for signed-in online sessions.
  if (!guestViewer()) {
    void (async () => {
      try {
        const remote = await createSprintAction(name, goal, startDate, endDate);
        if (remote && remote.id && remote.id !== local.id) {
          // Reconcile to the server-assigned id when it differs.
          await localdb.sprints.delete(local.id);
          await localdb.sprints.put(remote as any);
          notify();
        } else if (remote) {
          await localdb.sprints.put(remote as any);
          notify();
        }
      } catch {
        // Offline or unavailable: the local sprint remains usable on this device.
      }
    })();
  }

  return local;
}

/** Update a sprint's status locally first, then sync when possible. */
export async function updateSprintStatusLocal(sprintId: string, status: "planned" | "active" | "completed"): Promise<void> {
  await localdb.sprints.update(sprintId, { status });
  notify();

  if (!guestViewer()) {
    void (async () => {
      try {
        await updateSprintStatusAction(sprintId, status);
      } catch {
        // Offline or unavailable: local state is already updated.
      }
    })();
  }
}

/** Assign a task to a sprint locally first, then sync via the normal todo outbox. */
export async function assignTodoToSprintLocal(todoId: string, sprintId: string | null): Promise<void> {
  const todo = await getTodo(todoId);
  if (todo) {
    await localdb.todos.update(todoId, { sprint_id: sprintId, dirty: 1, local_updated: Date.now() });
    await enqueueOp({ kind: "upsert", todo_id: todoId, created_at: Date.now() });
    notify();
    void flush();
  }

  // Best-effort direct sync; the todo outbox also carries sprint_id.
  if (!guestViewer()) {
    void (async () => {
      try {
        await assignTodoToSprintAction(todoId, sprintId);
      } catch {
        // Offline or unavailable: queued todo sync will propagate sprint_id.
      }
    })();
  }
}

/** Refresh the owner's team mirror. */
export async function pullTeam(): Promise<void> {
  // Guest mode is local-only: a server call here would redirect the guest
  // straight to the sign-in screen.
  if (guestViewer()) {
    return;
  }

  const startedAt = Date.now();

  try {
    const rows = await loadTeamTodosSync();
    const previousTeamIds = new Set((await getMeta<string[]>("team_ids")) ?? []);

    await setMeta(
      "team_ids",
      rows.map((row) => row.id),
    );
    await mergeIncoming(rows, "team", (row) => previousTeamIds.has(row.id), startedAt);
    void migrateLegacyRows();
  } catch {
    // offline
  }
}

/**
 * The automatic migration for accounts that predate encryption: every
 * plaintext row still in the mirror (or on the server) is re-written as
 * ciphertext with the current content key and pushed through the normal
 * outbox. Idempotent — encrypted rows are skipped — so it can run after
 * every sync until nothing is left in the clear.
 */
export async function migrateLegacyRows(): Promise<number> {
  const key = contentKey();

  if (!key) {
    return 0;
  }

  const rows = await allTodos();
  let migrated = 0;

  for (const row of rows) {
    if (row.tombstone) {
      continue;
    }

    const titleIsEncrypted = isEncrypted(row.title);
    const blockerIsClear = !row.blocker || isEncrypted(row.blocker);

    if (titleIsEncrypted && blockerIsClear) {
      continue;
    }

    const next: LocalTodo = { ...row };

    if (!titleIsEncrypted) {
      next.title = await encryptField(key, row.title);
    }

    if (row.blocker && !isEncrypted(row.blocker)) {
      next.blocker = await encryptField(key, row.blocker);
    }

    next.dirty = 1;
    await putTodos([next]);
    await enqueueOp({ kind: "upsert", todo_id: row.id, created_at: Date.now() });
    migrated += 1;
  }

  if (migrated > 0) {
    notify();
    void flush();
  }

  return migrated;
}

/* --------------------------------------------------------------- flushing */

async function flushOnce(): Promise<boolean> {
  const ops = await pendingOps();

  if (ops.length === 0) {
    return false;
  }

  const payload: PushOp[] = [];
  const byTodo = new Map<string, { opId: number; createdAt: number; kind: string }>();

  for (const op of ops) {
    if (op.kind === "delete") {
      payload.push({ kind: "delete", id: op.todo_id });
      byTodo.set(op.todo_id, { opId: op.id!, createdAt: op.created_at, kind: "delete" });
      continue;
    }

    const row = await getTodo(op.todo_id);

    if (!row || row.tombstone) {
      // Nothing to upsert (a delete op covers vanished rows) — drop it.
      await dropOp(op.id!);
      continue;
    }

    payload.push(pushOpFor(row));
    byTodo.set(op.todo_id, { opId: op.id!, createdAt: op.created_at, kind: "upsert" });
  }

  if (payload.length === 0) {
    return false;
  }

  let results;

  try {
    results = await pushTodos(payload);
  } catch {
    return false; // offline — keep the outbox, retry later
  }

  for (const result of results) {
    const meta = byTodo.get(result.id);

    if (!meta) {
      continue;
    }

    if (!result.ok) {
      // A real server rejection (validation/permission): drop the op, clear
      // the pending flags so the reconciliation below can actually apply,
      // tell the UI, and re-pull server truth immediately instead of on the
      // next scheduled pull.
      await dropOp(meta.opId);

      const remaining = await localdb.ops.where("todo_id").equals(result.id).count();

      if (remaining === 0) {
        const row = await getTodo(result.id);

        if (row) {
          // The server kept its version — un-tombstone/ un-dirty the row so
          // the fresh pull can restore it (a rejected delete keeps the task).
          await localdb.todos.update(result.id, { dirty: 0, tombstone: 0 });
        }
      }

      emitSyncError(result.error ?? "A change could not be saved.");
      void pullOwn();
      if (viewer?.isOwner) {
        void pullTeam();
      }
      continue;
    }

    // Only drop the op if nothing newer was queued while we were pushing.
    const current = await localdb.ops.get(meta.opId);

    if (!current || current.created_at !== meta.createdAt) {
      continue;
    }

    await dropOp(meta.opId);

    if (meta.kind === "delete") {
      await localdb.todos.delete(result.id);
    } else {
      const row = await getTodo(result.id);

      if (row) {
        const stillPending = (await localdb.ops.where("todo_id").equals(result.id).count()) > 0;

        if (!stillPending) {
          await localdb.todos.update(result.id, { dirty: 0 });
        }
      }
    }
  }

  notify();
  return true;
}

/** Drain the outbox (keeps going while progress is made). */
export async function flush(): Promise<void> {
  // Guest mode is local-only: never call server actions that would redirect.
  if (guestViewer()) {
    return;
  }

  if (flushing) {
    return;
  }

  flushing = true;

  try {
    for (let round = 0; round < 10; round += 1) {
      const progressed = await flushOnce();

      if (!progressed) {
        break;
      }
    }
  } catch {
    // Offline (or a rejected server action): the queued writes stay on this
    // device and go out on the next connected sync. Never reject into callers.
  } finally {
    flushing = false;
  }
}

/** Flush + refresh in one go (online event, focus, app start). */
export async function syncNow(): Promise<void> {
  if (guestViewer()) {
    return;
  }

  await flush();
  await pullOwn();
}

/** Wire the background loops. Idempotent. */
export function startSync(): void {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;

  window.addEventListener("online", () => {
    void syncNow();
  });

  window.addEventListener("focus", () => {
    void flush();
  });

  window.setInterval(() => {
    void flush();
  }, 20_000);

  // Passive organization-key grants: while the owner's app stays open, a
  // member who signs up receives their grant within a minute — their
  // waiting screen re-checks on its own and enters the app. Password logins
  // grant immediately, and the team page's Activate button is the on-demand
  // path, so no member stays behind the "organization key" barrier.
  let granting = false;

  window.setInterval(() => {
    if (granting || !viewer?.isOwner) {
      return;
    }

    granting = true;
    void grantPendingMembers()
      .catch(() => undefined)
      .finally(() => {
        granting = false;
      });
  }, 60_000);
}

/** Sign-out: push what we can, then drop the device's copy. */
export async function drainBeforeSignOut(): Promise<void> {
  const deadline = Date.now() + 4000;

  while (Date.now() < deadline) {
    const ops = await pendingOps();

    if (ops.length === 0) {
      break;
    }

    const before = ops.length;
    await flush();

    if ((await pendingOps()).length === before) {
      break; // offline — nothing more to give
    }
  }
}

export { clearOps };
