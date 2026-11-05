"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ReportPeriod, ReportScope } from "@/lib/reportPeriods";

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

/**
 * Period, date pager, scope switch (owners) and the PDF download — the whole
 * report is a query string, so every change is a plain navigation.
 */
export function ReportControls({
  period,
  dateKey,
  prevDate,
  nextDate,
  scope,
  canSwitchScope,
  pdfHref,
}: {
  period: ReportPeriod;
  dateKey: string;
  prevDate: string;
  nextDate: string;
  scope: ReportScope;
  canSwitchScope: boolean;
  pdfHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(changes: { period?: ReportPeriod; date?: string; scope?: ReportScope }) {
    const next = new URLSearchParams(searchParams.toString());

    if (changes.period) {
      next.set("period", changes.period);
    }
    if (changes.date) {
      next.set("date", changes.date);
    }
    if (changes.scope) {
      next.set("scope", changes.scope);
    }

    router.push(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  }

  return (
    <div className="report-controls">
      <div className="report-periods" role="group" aria-label="Report period">
        {PERIODS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`pill${period === option.id ? " is-active" : ""}`}
            onClick={() => go({ period: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="report-pager">
        <button
          type="button"
          className="pager-btn"
          aria-label="Previous period"
          onClick={() => go({ date: prevDate })}
        >
          ‹
        </button>
        <input
          className="input report-date"
          type="date"
          name="date"
          aria-label="Report date"
          value={dateKey}
          onChange={(event) => {
            if (event.target.value) {
              go({ date: event.target.value });
            }
          }}
        />
        <button
          type="button"
          className="pager-btn"
          aria-label="Next period"
          onClick={() => go({ date: nextDate })}
        >
          ›
        </button>
      </div>

      {canSwitchScope ? (
        <div className="report-periods" role="group" aria-label="Report scope">
          <button
            type="button"
            className={`pill${scope === "org" ? " is-active" : ""}`}
            onClick={() => go({ scope: "org" })}
          >
            Organization
          </button>
          <button
            type="button"
            className={`pill${scope === "mine" ? " is-active" : ""}`}
            onClick={() => go({ scope: "mine" })}
          >
            Mine
          </button>
        </div>
      ) : null}

      <a className="btn-primary btn-small report-download" href={pdfHref}>
        Download PDF
      </a>
    </div>
  );
}
