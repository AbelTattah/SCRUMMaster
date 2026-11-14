import { describe, expect, it } from "vitest";

import { filterTasks } from "@/lib/taskBuckets";
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
  } as TeamTodo;
}

describe("taskBuckets home view", () => {
  it("home view includes tasks across states (subject to search/sprint filters)", () => {
    const rows = [
      makeTodo({ id: "done", completed: true }),
      makeTodo({ id: "now", start_time: "09:00" }),
      makeTodo({ id: "backlog", start_time: null, end_time: null }),
    ];
    const out = filterTasks(rows, { page: "home", now: new Date("2026-11-14T12:00:00Z") });
    expect(out.map((t) => t.id).sort()).toEqual(["backlog", "done", "now"]);
  });
});
