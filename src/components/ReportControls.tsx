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
 * report is a query string, so every change is a plain navigation. The PDF
 * itself is generated in the browser: task titles are encrypted, so the
 * server cannot build the document.
 */
export function ReportControls({
  period,
  dateKey,
  prevDate,
  nextDate,
  scope,
  canSwitchScope,
  onDownload,
  downloading,
  onDownloadWord,
  downloadingWord,
}: {
  period: ReportPeriod;
  dateKey: string;
  prevDate: string;
  nextDate: string;
  scope: ReportScope;
  canSwitchScope: boolean;
  onDownload: () => void;
  downloading?: boolean;
  /** Wired once the .docx builder lands; hidden while undefined. */
  onDownloadWord?: () => void;
  downloadingWord?: boolean;
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

      <button
        className="btn-primary btn-small report-download"
        type="button"
        onClick={onDownload}
        disabled={downloading}
      >
        {downloading ? "Preparing…" : "Download PDF"}
      </button>

      {onDownloadWord ? (
        <button
          className="btn-ghost btn-small report-download"
          type="button"
          onClick={onDownloadWord}
          disabled={downloadingWord}
          title="Export the stand-up report as a Word document"
        >
          {downloadingWord ? "Preparing…" : "Download Word"}
        </button>
      ) : null}
    </div>
  );
}
