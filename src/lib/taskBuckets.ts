import type { PageFilter, TeamTodo } from "@/lib/types";

/**
 * Pure filtering logic for task views (Today, Backlog, Now, Completed).
 * Kept separate from the UI so it can be tested and stay consistent.
 */

export function isCreatedToday(createdAt: string, now: Date = new Date()): boolean {
  const created = new Date(createdAt);
  return (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate()
  );
}

export function isScheduledTask(row: Pick<TeamTodo, "start_time" | "end_time">): boolean {
  return Boolean(row.start_time || row.end_time);
}

export interface TaskFilterOptions {
  page: PageFilter;
  queries?: string[];
  sprintId?: string | null;
  now?: Date;
}

export function matchesTaskView(
  row: TeamTodo,
  { page, queries = [], sprintId, now }: TaskFilterOptions,
): boolean {
  const isCompleted = Boolean(row.completed);
  const scheduled = isScheduledTask(row);

  if (page === "completed" && !isCompleted) {
    return false;
  }

  // Now: scheduled work that has not been finished yet.
  if (page === "in-progress" && (isCompleted || !scheduled)) {
    return false;
  }

  // Backlog: drafts - captured but never scheduled, and not done.
  if (page === "backlog" && (isCompleted || scheduled)) {
    return false;
  }

  // Today: today's captures (any state) plus outstanding scheduled work.
  if (page === "today") {
    const createdToday = isCreatedToday(row.created_at, now);
    const underway = !isCompleted && scheduled;
    if (!createdToday && !underway) {
      return false;
    }
  }

  const needles = queries.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (needles.some((needle) => !row.title.toLowerCase().includes(needle))) {
    return false;
  }

  // Sprint filter: when a sprint is selected, only show tasks in that sprint.
  if (sprintId && row.sprint_id !== sprintId) {
    return false;
  }

  return true;
}

export function filterTasks(rows: TeamTodo[], options: TaskFilterOptions): TeamTodo[] {
  return rows
    .filter((row) => matchesTaskView(row, options))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
