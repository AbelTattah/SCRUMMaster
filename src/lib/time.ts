import { appTimezone } from "@/lib/env";

/**
 * Tasks store a wall-clock time and no date. "Today" is therefore resolved in
 * the application's configured timezone, not the server's (a hosted server
 * usually runs in UTC).
 */

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimezone(),
    ...options,
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function nowMinutes(now: Date = new Date()): number {
  const value = parts(now, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return Number(value.hour) * 60 + Number(value.minute);
}

export function greetingFor(name: string, now: Date = new Date()): string {
  const hour = Number(parts(now, { hour: "2-digit", hour12: false }).hour);
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return `Good ${part} ${name}!`;
}

/** "Today, Monday 2 November, 2026" — matches the original date line. */
export function todayLine(now: Date = new Date()): string {
  const value = parts(now, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `Today, ${value.weekday} ${value.day} ${value.month}, ${value.year}`;
}

/** Postgres returns "10:30:00"; the UI only needs "10:30". */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value);

  return match ? `${match[1]}:${match[2]}` : null;
}

/** Keep only well-formed HH:MM values coming from <input type="time">. */
export function sanitizeTime(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

/** "14:00" → "2:00PM" (the design's format). */
export function formatTime(value: string): string {
  const normalized = normalizeTime(value) ?? "00:00";
  const [hourText, minute] = normalized.split(":");
  const hour = Number(hourText);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute}${hour >= 12 ? "PM" : "AM"}`;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start || !end) {
    return null;
  }

  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) {
    return "less than a minute";
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** "2026-11-04" — today in the application timezone. */
export function dateKey(date: Date = new Date()): string {
  const value = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });

  return `${value.year}-${value.month}-${value.day}`;
}

/**
 * Midnight of "today" in the application timezone, as an instant.
 *
 * Derived from nowMinutes() (minutes since app-tz midnight), so it is exact
 * for fixed-offset zones like the default Africa/Accra; on DST days it lands
 * within an hour of the true boundary, which is plenty for "created today".
 */
export function startOfToday(now: Date = new Date()): Date {
  const elapsedSeconds = nowMinutes(now) * 60 + now.getSeconds();

  return new Date(now.getTime() - elapsedSeconds * 1000 - now.getMilliseconds());
}

/** The calendar day before a "YYYY-MM-DD" key. */
export function previousDateKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() - 1);

  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}-${nextMonth}-${nextDay}`;
}

/** "Wednesday 4 November 2026" for a "YYYY-MM-DD" report date. */
export function formatDayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** "4 November 2026" — compact form for history lists. */
export function formatDayShort(key: string): string {
  const [year, month, day] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** "4 Nov, 14:02" — a created-at stamp in the application timezone. */
export function formatStamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: appTimezone(),
  }).format(date);
}
