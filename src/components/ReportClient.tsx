"use client";

/**
 * The report body: decrypts the task rows the server produced (it can only
 * see ciphertext), renders them, and exports the PDF with jsPDF — the same
 * layout as the old server renderer, built here where the titles exist.
 */
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

import { ReportControls } from "@/components/ReportControls";
import { Icon } from "@/components/icons";
import { decryptText } from "@/lib/sync";
import type { ReportTask } from "@/lib/data/reports";
import type { ReportPeriod, ReportScope } from "@/lib/reportPeriods";
import { formatStamp, formatTimeRange } from "@/lib/time";

const PURPLE = "#21005D";
const INK = "#1A1A1A";
const MUTED = "#727272";
const LINE = "#E4E4E4";
const ROW_ALT = "#F8F7FC";
const GREEN = "#1E7A46";
const RED = "#B3261E";
const AMBER = "#B45309";
const MARGIN = 48;

interface ReportSummary {
  created: number;
  completed: number;
  inProgress: number;
  blocked: number;
  rate: number;
}

interface Props {
  period: ReportPeriod;
  dateKey: string;
  prevDate: string;
  nextDate: string;
  scope: ReportScope;
  canSwitchScope: boolean;
  windowLabel: string;
  filename: string;
  scopeLabel: string;
  authorName: string;
  tasks: ReportTask[];
  summary: ReportSummary;
}

function statusOf(task: ReportTask): { key: string; label: string } {
  if (task.completed) {
    return { key: "done", label: "Completed" };
  }

  if (task.blocker) {
    return { key: "blocked", label: "Blocked" };
  }

  return { key: "open", label: "In progress" };
}

function statusColor(task: ReportTask): string {
  if (task.completed) {
    return GREEN;
  }

  return task.blocker ? RED : AMBER;
}

function hex(value: string): [number, number, number] {
  const raw = value.replace("#", "");

  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

const generatedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const createdFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let out = text;

  while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) {
    out = out.slice(0, -1);
  }

  return `${out}…`;
}

/** A4 portrait, brand header, summary row, paginated task table. */
function buildPdf(input: {
  period: string;
  label: string;
  scopeLabel: string;
  authorName: string;
  tasks: ReportTask[];
  summary: ReportSummary;
  filename: string;
}): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentWidth = pageW - MARGIN * 2;

  /** Text with a top-of-line coordinate (matches the old pdfkit layout). */
  function text(
    value: string,
    x: number,
    top: number,
    size: number,
    color: string,
    options: { bold?: boolean; width?: number; align?: "right" | "center" } = {},
  ): number {
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const [r, g, b] = hex(color);
    doc.setTextColor(r, g, b);

    let out = value;

    if (options.width) {
      out = truncate(doc, value, options.width);
    }

    doc.text(out, x, top + size, options.align ? { align: options.align } : undefined);
    return top + size;
  }

  function rule(atY: number): void {
    const [r, g, b] = hex(LINE);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1);
    doc.line(MARGIN, atY, MARGIN + contentWidth, atY);
  }

  function tableHeader(top: number): number {
    const widths = [22, contentWidth - 22 - 70 - 92 - 84, 70, 92, 84];
    const titles = ["#", "TASK", "STATUS", "WHO", "CREATED"];
    let x = MARGIN;

    for (let index = 0; index < titles.length; index += 1) {
      text(titles[index], x, top, 8, MUTED, { bold: true, width: widths[index] - 4 });
      x += widths[index];
    }

    rule(top + 12);
    return top + 20;
  }

  let y = MARGIN;

  // --- header ------------------------------------------------------------
  text("Scrum Master", MARGIN, y, 20, PURPLE, {
    bold: true,
    width: contentWidth * 0.6,
  });
  text(`Generated ${generatedFormatter.format(new Date())}`, MARGIN + contentWidth, y + 4, 9, MUTED, {
    align: "right",
    width: contentWidth,
  });

  y += 34;
  text(`${capitalize(input.period)} report`, MARGIN, y, 16, INK, { bold: true });
  y += 22;
  text(`${input.label} · ${input.scopeLabel} · ${input.authorName}`, MARGIN, y, 11, MUTED, {
    width: contentWidth,
  });

  y += 20;
  rule(y);
  y += 18;

  // --- summary row -------------------------------------------------------
  const metrics: [string, string][] = [
    [String(input.summary.created), "Tasks created"],
    [String(input.summary.completed), "Completed"],
    [String(input.summary.inProgress), "In progress"],
    [String(input.summary.blocked), "Blocked"],
    [`${input.summary.rate}%`, "Completion rate"],
  ];
  const columnWidth = contentWidth / metrics.length;

  for (let index = 0; index < metrics.length; index += 1) {
    const [value, caption] = metrics[index];
    const x = MARGIN + index * columnWidth;

    text(value, x, y, 18, PURPLE, { bold: true, width: columnWidth - 10 });
    text(caption, x, y + 24, 9, MUTED, { width: columnWidth - 10 });
  }

  y += 52;

  // --- task table --------------------------------------------------------
  const widths = [22, contentWidth - 22 - 70 - 92 - 84, 70, 92, 84];
  y = tableHeader(y);

  if (input.tasks.length === 0) {
    y = text("No tasks were created in this period.", MARGIN, y, 11, MUTED, {
      width: contentWidth,
    });
  }

  input.tasks.forEach((task, index) => {
    const rowHeight = 20;

    if (y + rowHeight > pageH - MARGIN) {
      doc.addPage();
      y = tableHeader(MARGIN);
    }

    if (index % 2 === 1) {
      const [r, g, b] = hex(ROW_ALT);
      doc.setFillColor(r, g, b);
      doc.rect(MARGIN, y - 4, contentWidth, rowHeight, "F");
    }

    const who = task.assignee_name || task.creator_name || "—";
    const created = createdFormatter.format(new Date(task.created_at));
    let x = MARGIN;

    text(String(index + 1), x, y, 9, MUTED, { width: widths[0] - 4 });
    x += widths[0];

    text(task.title, x, y, 9.5, INK, { bold: true, width: widths[1] - 8 });
    x += widths[1];

    text(statusOf(task).label, x, y, 8.5, statusColor(task), {
      bold: true,
      width: widths[2] - 6,
    });
    x += widths[2];

    text(who, x, y, 9, INK, { width: widths[3] - 6 });
    x += widths[3];

    text(created, x, y, 9, MUTED, { width: widths[4] });

    y += rowHeight;
  });

  // --- footer ------------------------------------------------------------
  y = Math.min(y + 10, pageH - MARGIN - 10);
  rule(y);
  text(
    "Scrum Master report — tasks selected by creation time within the period.",
    MARGIN + contentWidth / 2,
    y + 8,
    8,
    MUTED,
    { align: "center", width: contentWidth },
  );

  doc.save(input.filename);
}

export function ReportClient(props: Props) {
  const [tasks, setTasks] = useState<ReportTask[] | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const out: ReportTask[] = [];

      for (const task of props.tasks) {
        out.push({
          ...task,
          title: await decryptText(task.title),
          blocker: task.blocker ? await decryptText(task.blocker) : null,
        });
      }

      if (alive) {
        setTasks(out);
      }
    })();

    return () => {
      alive = false;
    };
  }, [props.tasks]);

  function download() {
    if (!tasks || downloading) {
      return;
    }

    setDownloading(true);

    try {
      buildPdf({
        period: props.period,
        label: props.windowLabel,
        scopeLabel: props.scopeLabel,
        authorName: props.authorName,
        tasks,
        summary: props.summary,
        filename: props.filename,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <ReportControls
        period={props.period}
        dateKey={props.dateKey}
        prevDate={props.prevDate}
        nextDate={props.nextDate}
        scope={props.scope}
        canSwitchScope={props.canSwitchScope}
        onDownload={download}
        downloading={downloading}
      />

      <section className="panel report-tasks" aria-label="Tasks in this period">
        {tasks === null ? (
          <p className="empty">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks were created in {props.windowLabel.toLowerCase()}.</p>
        ) : (
          tasks.map((task) => {
            const status = statusOf(task);
            const range = formatTimeRange(task.start_time, task.end_time);

            return (
              <div className={`report-task${task.completed ? " is-done" : ""}`} key={task.id}>
                <span
                  className={`report-dot report-dot--${status.key}`}
                  aria-hidden="true"
                />

                <span className="report-task-title">{task.title}</span>

                <span className="report-task-meta">
                  {task.assignee_name ? (
                    <span className="chip chip--assignee">{task.assignee_name}</span>
                  ) : null}

                  {props.scope === "org" && task.creator_name ? (
                    <span className="report-by">by {task.creator_name}</span>
                  ) : null}

                  {range ? (
                    <span className="report-range">
                      <Icon name="clock" />
                      <span>{range}</span>
                    </span>
                  ) : null}

                  <span className="report-created">{formatStamp(task.created_at)}</span>

                  <span className={`report-chip report-chip--${status.key}`}>
                    {status.label}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
