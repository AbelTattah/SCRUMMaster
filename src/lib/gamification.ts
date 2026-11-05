/**
 * Pure gamification rules — XP values and levels.
 * Mutations live in src/lib/data/gamification.ts.
 */

/** Awarded to whoever completes a task. */
export const XP_TASK_COMPLETE = 10;

/** XP needed between levels: level = floor(xp / XP_PER_LEVEL) + 1. */
export const XP_PER_LEVEL = 250;

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
