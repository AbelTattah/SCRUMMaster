/**
 * The offline-first local store: an IndexedDB mirror of everything the user
 * can see, plus the outbox of not-yet-synced writes.
 *
 * The UI reads exclusively from here (instant, works with no network); the
 * sync layer pushes ciphertext to Supabase in the background and pulls the
 * server's version back down.
 */
import Dexie, { type Table } from "dexie";

/** One mirrored todo row. `title`/`blocker` hold ciphertext (or legacy plaintext). */
export interface LocalTodo {
  id: string;
  user_id: string;
  title: string;
  blocker: string | null;
  completed: boolean;
  start_time: string | null;
  end_time: string | null;
  assignee_id: string | null;
  legacy_id: number | null;
  created_at: string;
  owner_name: string;
  owner_avatar: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  /** "own" rows are on the home list, "team" rows are the owner's org view. */
  scope: "own" | "team";
  /** 1 while a local change has not reached the server yet. */
  dirty: number;
  /** 1 after a local delete until the server confirms it. */
  tombstone: number;
  /** Epoch ms of the last local write — pull results older than this lose. */
  local_updated: number;
}

/**
 * A pending write. Ops are coalesced per todo (an upsert always carries the
 * row's full state), which makes the outbox idempotent and reorder-safe.
 */
export interface LocalOp {
  id?: number;
  kind: "upsert" | "delete";
  todo_id: string;
  created_at: number;
  tries: number;
  last_error?: string;
}

export interface MetaRow {
  k: string;
  v: unknown;
}

class ScrumMasterDB extends Dexie {
  todos!: Table<LocalTodo, string>;
  ops!: Table<LocalOp, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("scrum-master");

    this.version(1).stores({
      todos: "id, scope, dirty, tombstone, created_at",
      ops: "++id, todo_id, created_at",
      meta: "k",
    });
  }
}

export const localdb = new ScrumMasterDB();

/* ------------------------------------------------------------------ meta */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await localdb.meta.get(key);

  return row?.v as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await localdb.meta.put({ k: key, v: value });
}

export async function deleteMeta(key: string): Promise<void> {
  await localdb.meta.delete(key);
}

/* ----------------------------------------------------------------- todos */

export async function putTodos(rows: LocalTodo[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  await localdb.todos.bulkPut(rows);
}

export async function getTodo(id: string): Promise<LocalTodo | undefined> {
  return localdb.todos.get(id);
}

/** Every visible row (both scopes), newest first — the list's source. */
export async function allTodos(): Promise<LocalTodo[]> {
  return localdb.todos.orderBy("created_at").reverse().toArray();
}

export async function clearTodos(): Promise<void> {
  await localdb.todos.clear();
}

/* ------------------------------------------------------------------- ops */

export async function enqueueOp(op: Omit<LocalOp, "id" | "tries">): Promise<void> {
  // Coalesce: one pending op per todo — the newest full state wins.
  const existing = await localdb.ops.where("todo_id").equals(op.todo_id).toArray();

  if (existing.length > 0) {
    if (existing.length === 1 && existing[0].kind === op.kind) {
      await localdb.ops.update(existing[0].id!, { created_at: op.created_at, tries: 0 });
      return;
    }

    await localdb.ops.bulkDelete(existing.map((row) => row.id!));
  }

  await localdb.ops.add({ ...op, tries: 0 });
}

export async function pendingOps(): Promise<LocalOp[]> {
  return localdb.ops.orderBy("created_at").toArray();
}

export async function dropOp(id: number): Promise<void> {
  await localdb.ops.delete(id);
}

export async function opFailed(id: number, error: string): Promise<void> {
  await localdb.ops.update(id, { tries: 0, last_error: error.slice(0, 300) });
}

export async function clearOps(): Promise<void> {
  await localdb.ops.clear();
}

/** Wipe every trace of the signed-in account from this device. */
export async function wipeLocal(): Promise<void> {
  await Promise.all([localdb.todos.clear(), localdb.ops.clear(), localdb.meta.clear()]);
}
