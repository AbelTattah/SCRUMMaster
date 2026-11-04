/**
 * Pure gamification rules — XP values, levels and streak maths.
 * Mutations live in src/lib/data/gamification.ts and src/lib/data/reports.ts.
 */

/** Awarded to whoever completes a task. */
export const XP_TASK_COMPLETE = 10;

/** Base award for filing the first report of the day. */
export const XP_DAILY_REPORT = 20;

/** Extra award per consecutive reporting day (streak 2 → +5, capped at +25). */
export const XP_STREAK_BONUS = 5;
export const XP_STREAK_BONUS_MAX = 25;

/** XP needed between levels: level = floor(xp / XP_PER_LEVEL) + 1. */
export const XP_PER_LEVEL = 250;

/** After this local hour the "report not filed yet" reminder appears. */
export const REPORT_REMINDER_HOUR = 15;

export function levelFor(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number): {
  level: number;
  earned: number;
  needed: number;
  percent: number;
} {
  const safe = Math.max(0, xp);
  const level = levelFor(safe);
  const earned = safe % XP_PER_LEVEL;

  return {
    level,
    earned,
    needed: XP_PER_LEVEL,
    percent: Math.round((earned / XP_PER_LEVEL) * 100),
  };
}

/** The streak bonus the next report would earn (used as a UI hint). */
export function nextStreakBonus(streak: number, reportedToday: boolean): number {
  const projected = reportedToday ? streak : streak + 1;

  if (projected <= 1) {
    return 0;
  }

  return Math.min(XP_STREAK_BONUS * (projected - 1), XP_STREAK_BONUS_MAX);
}
