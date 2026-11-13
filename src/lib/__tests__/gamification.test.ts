import { describe, expect, it } from "vitest";

import { XP_PER_LEVEL, XP_TASK_COMPLETE, levelFor, levelProgress } from "@/lib/gamification";

describe("gamification", () => {
  it("exposes XP constants", () => {
    expect(XP_TASK_COMPLETE).toBe(10);
    expect(XP_PER_LEVEL).toBe(250);
  });

  it("computes level from xp", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(-10)).toBe(1);
    expect(levelFor(249)).toBe(1);
    expect(levelFor(250)).toBe(2);
    expect(levelFor(500)).toBe(3);
    expect(levelFor(749)).toBe(3);
  });

  it("computes level progress", () => {
    expect(levelProgress(0)).toEqual({ level: 1, earned: 0, needed: 250, percent: 0 });
    expect(levelProgress(125)).toEqual({ level: 1, earned: 125, needed: 250, percent: 50 });
    expect(levelProgress(250)).toEqual({ level: 2, earned: 0, needed: 250, percent: 0 });
    expect(levelProgress(375)).toEqual({ level: 2, earned: 125, needed: 250, percent: 50 });
  });
});
