import { describe, expect, it } from "vitest";

import { filterTasks, isCreatedToday, isScheduledTask, matchesTaskView } from "@/lib/taskBuckets";
import type { TeamTodo } from "@/lib/types";

function makeTodo(overrides: Partial<TeamTodo> = {}): TeamTodo {
  return {
    id: "t1",
    user_id: "u1",
    title: "Task",
    completed: false,
    start_time: null,
    end_time: null,
    assignee_id: null,
    sprint_id: null,
    story_points: null,
    blocker: null,
    legacy_id: null,
    created_at: "2026-11-14T08:00:00.000Z",
    owner_name: "Owner",
    owner_avatar: null,
    assignee_name: null,
    assignee_avatar: null,
    ...overrides,
  };
}

const NOW = new Date("2026-11-14T12:00:00.000Z");

describe("taskBuckets", () => {
  it("detects if created today and if scheduled", () => {
    expect(isCreatedToday("2026-11-14T01:00:00.000Z", NOW)).toBe(true);
    expect(isCreatedToday("2026-11-13T23:00:00.000Z", NOW)).toBe(false);
    expect(isScheduledTask(makeTodo({ start_time: "09:00" }))).toBe(true);
    expect(isScheduledTask(makeTodo({ end_time: "10:00" }))).toBe(true);
    expect(isScheduledTask(makeTodo({ start_time: null, end_time: null }))).toBe(false);
  });

  it("filters Completed view (only completed tasks)", () => {
    const done = makeTodo({ id: "done", completed: true });
    const open = makeTodo({ id: "open", completed: false });
    const out = filterTasks([done, open], { page: "completed", now: NOW });
    expect(out.map((t) => t.id)).toEqual(["done"]);
  });

  it("filters Now (in-progress): scheduled, not completed", () => {
    const nowTask = makeTodo({ id: "now", completed: false, start_time: "09:00" });
    const draft = makeTodo({ id: "draft", completed: false, start_time: null, end_time: null });
    const doneScheduled = makeTodo({ id: "done", completed: true, start_time: "09:00" });
    const out = filterTasks([nowTask, draft, doneScheduled], { page: "in-progress", now: NOW });
    expect(out.map((t) => t.id)).toEqual(["now"]);
  });

  it("filters Backlog: unscheduled drafts, not completed", () => {
    const draft = makeTodo({ id: "draft", completed: false, start_time: null, end_time: null });
    const scheduled = makeTodo({ id: "sched", completed: false, start_time: "09:00" });
    const doneDraft = makeTodo({ id: "done", completed: true, start_time: null, end_time: null });
    const out = filterTasks([draft, scheduled, doneDraft], { page: "backlog", now: NOW });
    expect(out.map((t) => t.id)).toEqual(["draft"]);
  });

  it("filters Today: created today (any state) or underway scheduled", () => {
    const createdTodayDone = makeTodo({ id: "ctd", completed: true, created_at: "2026-11-14T07:00:00Z" });
    const createdTodayDraft = makeTodo({ id: "ctdraft", completed: false, created_at: "2026-11-14T07:00:00Z" });
    const underway = makeTodo({ id: "underway", completed: false, start_time: "10:00", created_at: "2026-11-10T07:00:00Z" });
    const oldDraft = makeTodo({ id: "old", completed: false, start_time: null, created_at: "2026-11-10T07:00:00Z" });
    const out = filterTasks([createdTodayDone, createdTodayDraft, underway, oldDraft], { page: "today", now: NOW });
    expect(out.map((t) => t.id).sort()).toEqual(["ctd", "ctdraft", "underway"].sort());
  });

  it("keeps views logically disjoint for a given task state", () => {
    const done = makeTodo({ id: "done", completed: true, start_time: "09:00", created_at: "2026-11-10T07:00:00Z" });
    const now = makeTodo({ id: "now", completed: false, start_time: "09:00", created_at: "2026-11-10T07:00:00Z" });
    const backlog = makeTodo({ id: "backlog", completed: false, start_time: null, end_time: null, created_at: "2026-11-10T07:00:00Z" });

    expect(matchesTaskView(done, { page: "completed", now: NOW })).toBe(true);
    expect(matchesTaskView(done, { page: "in-progress", now: NOW })).toBe(false);
    expect(matchesTaskView(done, { page: "backlog", now: NOW })).toBe(false);

    expect(matchesTaskView(now, { page: "completed", now: NOW })).toBe(false);
    expect(matchesTaskView(now, { page: "in-progress", now: NOW })).toBe(true);
    expect(matchesTaskView(now, { page: "backlog", now: NOW })).toBe(false);
    expect(matchesTaskView(now, { page: "today", now: NOW })).toBe(true); // underway scheduled

    expect(matchesTaskView(backlog, { page: "completed", now: NOW })).toBe(false);
    expect(matchesTaskView(backlog, { page: "in-progress", now: NOW })).toBe(false);
    expect(matchesTaskView(backlog, { page: "backlog", now: NOW })).toBe(true);
    expect(matchesTaskView(backlog, { page: "today", now: NOW })).toBe(false);
  });

  it("applies search queries and sprint filter", () => {
    const a = makeTodo({ id: "a", title: "Fix login bug", sprint_id: "s1", created_at: "2026-11-14T01:00:00Z" });
    const b = makeTodo({ id: "b", title: "Write docs", sprint_id: "s1", created_at: "2026-11-14T02:00:00Z" });
    const c = makeTodo({ id: "c", title: "Fix tests", sprint_id: "s2", created_at: "2026-11-14T03:00:00Z" });

    expect(filterTasks([a, b, c], { page: "home", queries: ["fix"], now: NOW }).map((t) => t.id)).toEqual(["a", "c"]);
    expect(filterTasks([a, b, c], { page: "home", queries: ["fix", "bug"], now: NOW }).map((t) => t.id)).toEqual(["a"]);
    expect(filterTasks([a, b, c], { page: "home", sprintId: "s1", now: NOW }).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("sorts by created_at ascending", () => {
    const t1 = makeTodo({ id: "t1", created_at: "2026-11-14T03:00:00Z" });
    const t2 = makeTodo({ id: "t2", created_at: "2026-11-14T01:00:00Z" });
    const t3 = makeTodo({ id: "t3", created_at: "2026-11-14T02:00:00Z" });
    expect(filterTasks([t1, t2, t3], { page: "home", now: NOW }).map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });
});
