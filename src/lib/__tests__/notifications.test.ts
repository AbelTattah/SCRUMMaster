import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_DEFAULT_LEAD,
  alertHeading,
  alertableNotifications,
  buildNotifications,
  notificationDigest,
  notificationKindHint,
  notificationKindLabel,
  notificationLeadMinutes,
  notificationUrl,
  todoNudge,
  todoNudgeEmail,
} from "@/lib/notifications";

describe("notifications", () => {
  it("returns default/validated lead minutes", () => {
    expect(notificationLeadMinutes(null)).toBe(NOTIFICATION_DEFAULT_LEAD);
    expect(notificationLeadMinutes({ notify_lead_minutes: 15 })).toBe(15);
    expect(notificationLeadMinutes({ notify_lead_minutes: 7 })).toBe(NOTIFICATION_DEFAULT_LEAD);
  });

  it("builds notifications with correct priority", () => {
    const items = buildNotifications(
      [
        { id: "1", title: "Upcoming", completed: false, start_time: "15:00", end_time: "16:00", blocker: null },
        { id: "2", title: "Reminder", completed: false, start_time: "12:15", end_time: "13:00", blocker: null },
        { id: "3", title: "Overdue", completed: false, start_time: "09:00", end_time: "10:00", blocker: null },
        { id: "4", title: "Blocked", completed: false, start_time: "11:00", end_time: "12:00", blocker: "need access" },
        { id: "5", title: "Done", completed: true, start_time: "11:00", end_time: "12:00", blocker: null },
      ],
      30,
      { now: 12 * 60 }, // 12:00
    );

    expect(items.map((i) => i.kind)).toEqual(["overdue", "blocker", "reminder", "upcoming"]);
    expect(items.find((i) => i.kind === "overdue")?.detail).toContain("Was due at");
    expect(items.find((i) => i.kind === "reminder")?.detail).toContain("Starts in");
    expect(items.find((i) => i.kind === "upcoming")?.detail).toContain("Starts at");
    expect(items.find((i) => i.kind === "blocker")?.blocker).toBe("need access");
  });

  it("marks in-progress reminder when start has passed", () => {
    const items = buildNotifications(
      [{ id: "1", title: "Now", completed: false, start_time: "11:30", end_time: "12:30", blocker: null }],
      30,
      { now: 12 * 60 },
    );
    expect(items[0].kind).toBe("reminder");
    expect(items[0].detail).toContain("Happening now");
  });

  it("provides labels, hints, alerting and urls", () => {
    expect(notificationKindLabel("overdue")).toBe("Overdue");
    expect(notificationKindLabel("blocker")).toBe("Blocked");
    expect(notificationKindLabel("reminder")).toBe("Reminders");
    expect(notificationKindLabel("upcoming")).toBe("Coming up");
    expect(notificationKindLabel("nudge")).toBe("Planning");
    expect(notificationKindHint("blocker")).toContain("waiting");

    expect(alertHeading("nudge")).toBe("Plan your day");
    expect(notificationUrl({ kind: "nudge", todo_id: "" })).toBe("/?add=1");
    expect(notificationUrl({ kind: "blocker", todo_id: "x" })).toBe("/notifications");
    expect(notificationUrl({ kind: "reminder", todo_id: "x" })).toBe("/?edit=x");

    const alertable = alertableNotifications([
      { key: "a", kind: "upcoming", todo_id: "1", title: "", detail: "", start_time: null, end_time: null, sort: 0, read: false, emailed: false },
      { key: "b", kind: "reminder", todo_id: "2", title: "", detail: "", start_time: null, end_time: null, sort: 0, read: false, emailed: false },
      { key: "c", kind: "reminder", todo_id: "3", title: "", detail: "", start_time: null, end_time: null, sort: 0, read: true, emailed: false },
    ] as any);
    expect(alertable.map((i) => i.key)).toEqual(["b"]);
  });

  it("creates planning nudge only in allowed hours", () => {
    expect(todoNudge(new Date("2026-11-13T08:00:00Z"))).toBeNull();
    expect(todoNudge(new Date("2026-11-13T21:00:00Z"))).toBeNull();
    const nudge = todoNudge(new Date("2026-11-13T10:30:00Z"));
    expect(nudge).not.toBeNull();
    expect(nudge?.kind).toBe("nudge");
    expect(nudge?.key).toContain("2026-11-13");
  });

  it("builds digest and nudge emails without leaking task text", () => {
    const digest = notificationDigest(
      [
        { key: "1", kind: "overdue", todo_id: "t1", title: "Secret", detail: "d", start_time: null, end_time: null, sort: 0, read: false, emailed: false },
        { key: "2", kind: "blocker", todo_id: "t2", title: "Secret2", detail: "d", start_time: null, end_time: null, sort: 0, read: false, emailed: false },
      ] as any,
      { name: "Ada" },
    );
    expect(digest.subject).toContain("need your attention");
    expect(digest.text).toContain("Ada");
    expect(digest.text).not.toContain("Secret");
    expect(digest.html).toContain("Open Scrum Master");

    const nudgeEmail = todoNudgeEmail({ name: "Ada" });
    expect(nudgeEmail.subject).toContain("plan your day");
    expect(nudgeEmail.html).toContain("Add a todo");
  });
});
