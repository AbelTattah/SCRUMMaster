import { appTimezone } from "@/lib/env";
import { dateKey as toDateKey, formatDayShort } from "@/lib/time";

/**
 * Report windows are anchored on a date and defined by when tasks were
 * CREATED: a daily report covers one calendar day, a weekly report the
 * Monday–Sunday week containing the date, a monthly report the calendar
 * month. All boundaries are local midnights in the application timezone,
 * converted to UTC instants for querying.
 */

export type ReportPeriod = "daily" | "weekly" | "monthly";
export type ReportScope = "mine" | "org";

export interface ReportWindow {
  period: ReportPeriod;
  /** The anchor date (YYYY-MM-DD). */
  dateKey: string;
  /** Inclusive range start / exclusive range end, as UTC instants. */
  start: Date;
  end: Date;
  /** Human label: "5 November 2026" / "3 – 9 November 2026" / "November 2026". */
  label: string;
  /** Suggested download file name. */
  filename: string;
  /** dateKey one period before / after, for the pager. */
  prevDate: string;
  nextDate: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePeriod(raw: string | null | undefined): ReportPeriod {
  return raw === "weekly" || raw === "monthly" ? raw : "daily";
}

export function parseDateKey(raw: string | null | undefined): string {
  return raw && DATE_RE.test(raw) ? raw : toDateKey();
}

function partsOf(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split("-").map(Number);
  return [year, month, day];
}

/** Offset of the application timezone at a given instant (ms). */
function tzOffsetMs(instant: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimezone(),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const fields: Record<string, string> = {};

  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") {
      fields[part.type] = part.value;
    }
  }

  const asUtc = Date.UTC(
    Number(fields.year),
    Number(fields.month) - 1,
    Number(fields.day),
    Number(fields.hour) % 24,
    Number(fields.minute),
    Number(fields.second),
  );

  return asUtc - instant.getTime();
}

/** Local midnight of a date key, as a UTC instant. */
function midnightOf(dateKey: string): Date {
  const [year, month, day] = partsOf(dateKey);
  const asUtc = Date.UTC(year, month - 1, day);

  return new Date(asUtc - tzOffsetMs(new Date(asUtc)));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function addMonths(dateKey: string, delta: number): string {
  const [year, month] = partsOf(dateKey);
  const target = new Date(Date.UTC(year, month - 1 + delta, 1));

  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Monday (local) of the week containing the anchor date. */
function mondayOf(dateKey: string): Date {
  const [year, month, day] = partsOf(dateKey);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  const back = (weekday + 6) % 7;

  return addDays(midnightOf(dateKey), -back);
}

function monthLabel(firstOfMonth: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: appTimezone(),
  }).format(new Date(firstOfMonth.getTime() + 12 * 3_600_000));
}

export function reportWindow(period: ReportPeriod, dateKey: string): ReportWindow {
  if (period === "daily") {
    const start = midnightOf(dateKey);
    const end = addDays(start, 1);

    return {
      period,
      dateKey,
      start,
      end,
      label: formatDayShort(dateKey),
      filename: `scrum-master-daily-${dateKey}.pdf`,
      prevDate: toDateKey(addDays(start, -1)),
      nextDate: toDateKey(addDays(start, 1)),
    };
  }

  if (period === "weekly") {
    const start = mondayOf(dateKey);
    const end = addDays(start, 7);

    return {
      period,
      dateKey,
      start,
      end,
      label: `${formatDayShort(toDateKey(start))} – ${formatDayShort(toDateKey(addDays(end, -1)))}`,
      filename: `scrum-master-weekly-${toDateKey(start)}_${toDateKey(addDays(end, -1))}.pdf`,
      prevDate: toDateKey(addDays(start, -7)),
      nextDate: toDateKey(addDays(start, 7)),
    };
  }

  const start = midnightOf(`${dateKey.slice(0, 7)}-01`);
  const end = new Date(addMonths(dateKey, 1) ? midnightOf(addMonths(dateKey, 1)) : start);
  const lastDay = addDays(end, -1);

  return {
    period,
    dateKey,
    start,
    end,
    label: monthLabel(start),
    filename: `scrum-master-monthly-${dateKey.slice(0, 7)}.pdf`,
    prevDate: addMonths(dateKey, -1),
    nextDate: addMonths(dateKey, 1),
  };
}
