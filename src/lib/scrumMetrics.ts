import type { Sprint, TeamTodo } from "@/lib/types";

export interface SprintMetrics {
  /** Total story points committed to the sprint. */
  committed: number;
  /** Story points completed so far. */
  completed: number;
  /** Remaining story points. */
  remaining: number;
  /** Percentage of the committed scope finished (0-100). */
  completionRate: number;
  /** Task counts by state. */
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  blockedTasks: number;
  /** Average cycle time in hours for tasks finished in this sprint. */
  averageCycleTimeHours: number | null;
}

export function sprintMetrics(sprint: Sprint, todos: TeamTodo[]): SprintMetrics {
  const items = todos.filter((todo) => todo.sprint_id === sprint.id);

  const committed = items.reduce((sum, todo) => sum + (todo.story_points ?? 0), 0);
  const completed = items
    .filter((todo) => todo.completed)
    .reduce((sum, todo) => sum + (todo.story_points ?? 0), 0);

  const completedTasks = items.filter((todo) => todo.completed).length;

  const cycleTimes = items
    .filter((todo) => todo.completed && todo.story_points !== null)
    .map((todo) => {
      const created = new Date(todo.created_at).getTime();
      const finished = new Date(sprint.end_date).getTime();
      return Math.max(0, finished - created) / 3_600_000;
    });

  return {
    committed,
    completed,
    remaining: Math.max(0, committed - completed),
    completionRate: committed > 0 ? Math.round((completed / committed) * 100) : 0,
    totalTasks: items.length,
    completedTasks,
    openTasks: items.length - completedTasks,
    blockedTasks: items.filter((todo) => Boolean(todo.blocker)).length,
    averageCycleTimeHours:
      cycleTimes.length > 0
        ? Math.round(
            (cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length) * 10,
          ) / 10
        : null,
  };
}

export interface VelocityPoint {
  sprintId: string;
  name: string;
  completed: number;
  committed: number;
}

/**
 * Velocity across completed sprints, oldest first. The average gives the
 * team a forecast for the next sprint.
 */
export function velocityHistory(
  sprints: Sprint[],
  todos: TeamTodo[],
): { points: VelocityPoint[]; average: number } {
  const completed = sprints
    .filter((sprint) => sprint.status === "completed")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const points = completed.map((sprint) => {
    const items = todos.filter((todo) => todo.sprint_id === sprint.id);

    return {
      sprintId: sprint.id,
      name: sprint.name,
      completed: items
        .filter((todo) => todo.completed)
        .reduce((sum, todo) => sum + (todo.story_points ?? 0), 0),
      committed: items.reduce((sum, todo) => sum + (todo.story_points ?? 0), 0),
    };
  });

  const average =
    points.length > 0
      ? Math.round(
          (points.reduce((sum, point) => sum + point.completed, 0) / points.length) * 10,
        ) / 10
      : 0;

  return { points, average };
}

/**
 * Evidence-Based Management snapshot for a sprint: the four Key Value Areas.
 * The app can only measure flow and value proxies - the rest are estimated.
 */
export interface EbmSnapshot {
  /** Current Value: how much of the committed scope is done. */
  currentValue: number;
  /** Unrealized Value: work still in the sprint. */
  unrealizedValue: number;
  /** Ability to Innovate: share of remaining capacity (not blocked). */
  abilityToInnovate: number;
  /** Time to Market: days since the sprint started. */
  timeToMarket: number;
}

export function ebmSnapshot(sprint: Sprint, metrics: SprintMetrics): EbmSnapshot {
  const start = new Date(sprint.start_date).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.round((now - start) / 86_400_000));

  const unblocked = metrics.totalTasks - metrics.blockedTasks;

  return {
    currentValue: metrics.completionRate,
    unrealizedValue: 100 - metrics.completionRate,
    abilityToInnovate:
      metrics.totalTasks > 0 ? Math.round((unblocked / metrics.totalTasks) * 100) : 100,
    timeToMarket: days,
  };
}
