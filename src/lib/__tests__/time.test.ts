import { describe, expect, it } from "vitest";

import {
  dateKey,
  formatDayLabel,
  formatDayShort,
  formatMinutes,
  formatTime,
  formatTimeRange,
  greetingFor,
  normalizeTime,
  nowMinutes,
  previousDateKey,
  sanitizeTime,
} from "@/lib/time";

describe("time helpers", () => {
  it("normalizes and sanitizes time values", () => {
    expect(normalizeTime("10:30")).toBe("10:30");
    expect(normalizeTime("10:30:00")).toBe("10:30");
    expect(normalizeTime("10:30:45.123")).toBe("10:30");
    expect(normalizeTime("24:00")).toBeNull();
    expect(normalizeTime("bad")).toBeNull();
    expect(normalizeTime(null)).toBeNull();

    expect(sanitizeTime("09:05")).toBe("09:05");
    expect(sanitizeTime("9:05")).toBeNull();
    expect(sanitizeTime("25:00")).toBeNull();
    expect(sanitizeTime(null)).toBeNull();
  });

  it("formats times and ranges", () => {
    expect(formatTime("00:05")).toBe("12:05AM");
    expect(formatTime("09:30")).toBe("9:30AM");
    expect(formatTime("12:00")).toBe("12:00PM");
    expect(formatTime("14:15")).toBe("2:15PM");
    expect(formatTimeRange("09:00", "10:30")).toBe("9:00AM - 10:30AM");
    expect(formatTimeRange(null, "10:30")).toBeNull();
  });

  it("formats minute durations", () => {
    expect(formatMinutes(0)).toBe("less than a minute");
    expect(formatMinutes(-5)).toBe("less than a minute");
    expect(formatMinutes(1)).toBe("1 minute");
    expect(formatMinutes(30)).toBe("30 minutes");
  });

  it("computes previous date key and labels", () => {
    expect(previousDateKey("2026-11-13")).toBe("2026-11-12");
    expect(previousDateKey("2026-03-01")).toBe("2026-02-28");
    expect(formatDayShort("2026-11-05")).toBe("5 November 2026");
    expect(formatDayLabel("2026-11-04")).toContain("2026");
  });

  it("computes date key and time-of-day from explicit dates", () => {
    // Africa/Accra is UTC (no DST)
    const d = new Date("2026-11-13T14:45:00Z");
    expect(dateKey(d)).toBe("2026-11-13");
    expect(nowMinutes(d)).toBe(14 * 60 + 45);
  });

  it("creates greetings based on hour", () => {
    expect(greetingFor("Ada", new Date("2026-11-13T08:00:00Z"))).toBe("Good morning Ada!");
    expect(greetingFor("Ada", new Date("2026-11-13T13:00:00Z"))).toBe("Good afternoon Ada!");
    expect(greetingFor("Ada", new Date("2026-11-13T19:00:00Z"))).toBe("Good evening Ada!");
  });
});
