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
