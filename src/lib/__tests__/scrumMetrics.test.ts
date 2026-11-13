import { describe, expect, it } from "vitest";

import { ebmSnapshot, sprintMetrics, velocityHistory } from "@/lib/scrumMetrics";
import type { Sprint, TeamTodo } from "@/lib/types";

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: "s1",
    user_id: "u1",
    name: "Sprint 1",
    goal: null,
    start_date: "2026-11-01",
    end_date: "2026-11-14",
    status: "active",
    created_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

function makeTodo(overrides: Partial<TeamTodo> = {}): TeamTodo {
  return {
    id: "t1",
    user_id: "u1",
    title: "Task",
    completed: false,
    start_time: null,
    end_time: null,
    assignee_id: null,
    sprint_id: "s1",
    story_points: 3,
    blocker: null,
    legacy_id: null,
    created_at: "2026-11-02T00:00:00Z",
    owner_name: "Owner",
    owner_avatar: null,
    assignee_name: null,
    assignee_avatar: null,
    ...overrides,
  };
}

describe("scrumMetrics", () => {
  it("computes sprint metrics", () => {
    const sprint = makeSprint();
    const todos = [
      makeTodo({ id: "t1", completed: true, story_points: 5 }),
      makeTodo({ id: "t2", completed: false, story_points: 3, blocker: "waiting" }),
      makeTodo({ id: "t3", completed: false, story_points: 2, sprint_id: "s2" }), // other sprint
      makeTodo({ id: "t4", completed: false, story_points: null }),
    ];

    const m = sprintMetrics(sprint, todos);
    expect(m.committed).toBe(8); // 5 + 3 + 0 in sprint s1
    expect(m.completed).toBe(5);
    expect(m.remaining).toBe(3);
    expect(m.completionRate).toBe(63); // 5/8 rounded
    expect(m.totalTasks).toBe(3);
    expect(m.completedTasks).toBe(1);
    expect(m.openTasks).toBe(2);
    expect(m.blockedTasks).toBe(1);
  });

  it("handles empty sprint", () => {
    const m = sprintMetrics(makeSprint(), []);
    expect(m.committed).toBe(0);
    expect(m.completed).toBe(0);
    expect(m.completionRate).toBe(0);
    expect(m.totalTasks).toBe(0);
    expect(m.averageCycleTimeHours).toBeNull();
  });

  it("computes velocity history from completed sprints", () => {
    const sprints = [
      makeSprint({ id: "s1", name: "Sprint 1", status: "completed", start_date: "2026-10-01" }),
      makeSprint({ id: "s2", name: "Sprint 2", status: "completed", start_date: "2026-10-15" }),
      makeSprint({ id: "s3", name: "Sprint 3", status: "active", start_date: "2026-11-01" }),
    ];
    const todos = [
      makeTodo({ id: "t1", sprint_id: "s1", completed: true, story_points: 5 }),
      makeTodo({ id: "t2", sprint_id: "s1", completed: false, story_points: 3 }),
      makeTodo({ id: "t3", sprint_id: "s2", completed: true, story_points: 8 }),
      makeTodo({ id: "t4", sprint_id: "s3", completed: true, story_points: 13 }),
    ];

    const v = velocityHistory(sprints, todos);
    expect(v.points).toHaveLength(2);
    expect(v.points[0]).toEqual({ sprintId: "s1", name: "Sprint 1", completed: 5, committed: 8 });
    expect(v.points[1]).toEqual({ sprintId: "s2", name: "Sprint 2", completed: 8, committed: 8 });
    expect(v.average).toBe(6.5);
  });

  it("computes EBM snapshot", () => {
    const sprint = makeSprint({ start_date: "2026-11-01" });
    const metrics = sprintMetrics(sprint, [
      makeTodo({ id: "t1", completed: true, story_points: 5, blocker: null }),
      makeTodo({ id: "t2", completed: false, story_points: 5, blocker: "blocked" }),
    ]);
    const snap = ebmSnapshot(sprint, metrics);
    expect(snap.currentValue).toBe(50);
    expect(snap.unrealizedValue).toBe(50);
    expect(snap.abilityToInnovate).toBe(50); // 1 unblocked out of 2
    expect(typeof snap.timeToMarket).toBe("number");
    expect(snap.timeToMarket).toBeGreaterThanOrEqual(0);
  });
});
