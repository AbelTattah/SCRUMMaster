import { describe, expect, it } from "vitest";

import { parseDateKey, parsePeriod, reportWindow } from "@/lib/reportPeriods";

describe("reportPeriods", () => {
  it("parses period and date keys", () => {
    expect(parsePeriod("daily")).toBe("daily");
    expect(parsePeriod("weekly")).toBe("weekly");
    expect(parsePeriod("monthly")).toBe("monthly");
    expect(parsePeriod("bogus")).toBe("daily");
    expect(parsePeriod(null)).toBe("daily");

    expect(parseDateKey("2026-11-13")).toBe("2026-11-13");
    expect(parseDateKey("bad")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds a daily window", () => {
    const w = reportWindow("daily", "2026-11-13");
    expect(w.period).toBe("daily");
    expect(w.dateKey).toBe("2026-11-13");
    expect(w.start.toISOString()).toBe("2026-11-13T00:00:00.000Z"); // Africa/Accra = UTC
    expect(w.end.toISOString()).toBe("2026-11-14T00:00:00.000Z");
    expect(w.filename).toBe("scrum-master-daily-2026-11-13.pdf");
    expect(w.prevDate).toBe("2026-11-12");
    expect(w.nextDate).toBe("2026-11-14");
    expect(w.label).toContain("2026");
  });

  it("builds a weekly window (Mon-Sun) containing the date", () => {
    // 2026-11-13 is a Friday; week Mon 2026-11-09 to Sun 2026-11-15 (end exclusive Mon 16th)
    const w = reportWindow("weekly", "2026-11-13");
    expect(w.period).toBe("weekly");
    expect(w.start.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(w.filename).toBe("scrum-master-weekly-2026-11-09_2026-11-15.pdf");
  });

  it("builds a monthly window", () => {
    const w = reportWindow("monthly", "2026-11-13");
    expect(w.period).toBe("monthly");
    expect(w.start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(w.filename).toBe("scrum-master-monthly-2026-11.pdf");
    expect(w.prevDate).toBe("2026-10-01");
    expect(w.nextDate).toBe("2026-12-01");
    expect(w.label).toContain("November");
  });
});
