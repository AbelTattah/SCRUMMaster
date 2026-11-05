import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

import { getCurrentUser } from "@/lib/auth";
import { buildReport, type ReportTask } from "@/lib/data/reports";
import { appTimezone } from "@/lib/env";
import { parseDateKey, parsePeriod, reportWindow, type ReportScope } from "@/lib/reportPeriods";

export const dynamic = "force-dynamic";

const PURPLE = "#21005D";
const INK = "#1A1A1A";
const MUTED = "#727272";
const LINE = "#E4E4E4";
const ROW_ALT = "#F8F7FC";
const GREEN = "#1E7A46";
const RED = "#B3261E";
const AMBER = "#B45309";
const MARGIN = 48;

function statusOf(task: ReportTask): { label: string; color: string } {
  if (task.completed) {
    return { label: "Completed", color: GREEN };
  }

  if (task.blocker) {
    return { label: "Blocked", color: RED };
  }

  return { label: "In progress", color: AMBER };
}

const createdFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: appTimezone(),
});

const generatedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: appTimezone(),
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** A4 portrait, brand header, summary row, then a paginated task table. */
function drawReport(
  doc: InstanceType<typeof PDFDocument>,
  input: {
    period: string;
    label: string;
    scopeLabel: string;
    authorName: string;
    tasks: ReportTask[];
    summary: {
      created: number;
      completed: number;
      inProgress: number;
      blocked: number;
      rate: number;
    };
  },
): void {
  const contentWidth = doc.page.width - MARGIN * 2;
  let y = MARGIN;

  // --- header -------------------------------------------------------------
  doc.font("Helvetica-Bold").fontSize(20).fillColor(PURPLE).text("Scrum Master", MARGIN, y, {
    width: contentWidth * 0.6,
  });
  doc.font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(`Generated ${generatedFormatter.format(new Date())}`, MARGIN, y + 4, {
      width: contentWidth,
      align: "right",
    });

  y = doc.y + 8;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(`${capitalize(input.period)} report`, MARGIN, y);
  y = doc.y + 2;
  doc.font("Helvetica")
    .fontSize(11)
    .fillColor(MUTED)
    .text(`${input.label} · ${input.scopeLabel} · ${input.authorName}`, MARGIN, y, {
      width: contentWidth,
    });

  y = doc.y + 12;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).strokeColor(LINE).lineWidth(1).stroke();
  y += 16;

  // --- summary row --------------------------------------------------------
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

    doc.font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(PURPLE)
      .text(value, x, y, { width: columnWidth - 10 });
    doc.font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(caption, x, doc.y + 1, { width: columnWidth - 10 });
  }

  y = doc.y + 18;

  // --- task table ---------------------------------------------------------
  const widths = [22, contentWidth - 22 - 70 - 92 - 84, 70, 92, 84];
  const titles = ["#", "TASK", "STATUS", "WHO", "CREATED"];

  function drawHeader(top: number): number {
    let x = MARGIN;

    for (let index = 0; index < titles.length; index += 1) {
      doc.font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(MUTED)
        .text(titles[index], x, top, { width: widths[index] });
      x += widths[index];
    }

    const lineY = top + 12;
    doc.moveTo(MARGIN, lineY).lineTo(MARGIN + contentWidth, lineY).strokeColor(LINE).lineWidth(1).stroke();

    return lineY + 8;
  }

  y = drawHeader(y);

  if (input.tasks.length === 0) {
    doc.font("Helvetica")
      .fontSize(11)
      .fillColor(MUTED)
      .text("No tasks were created in this period.", MARGIN, y, { width: contentWidth });
    y = doc.y;
  }

  input.tasks.forEach((task, index) => {
    const rowHeight = 20;

    if (y + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      y = drawHeader(MARGIN);
    }

    if (index % 2 === 1) {
      doc.save().rect(MARGIN, y - 3, contentWidth, rowHeight).fill(ROW_ALT).restore();
    }

    const status = statusOf(task);
    const who = task.assignee_name || task.creator_name || "—";
    const created = createdFormatter.format(new Date(task.created_at));

    let x = MARGIN;

    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(String(index + 1), x, y, {
      width: widths[0],
    });
    x += widths[0];

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(task.title, x, y, {
      width: widths[1] - 8,
      ellipsis: true,
    });
    x += widths[1];

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(status.color).text(status.label, x, y, {
      width: widths[2] - 6,
    });
    x += widths[2];

    doc.font("Helvetica").fontSize(9).fillColor(INK).text(who, x, y, {
      width: widths[3] - 6,
      ellipsis: true,
    });
    x += widths[3];

    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(created, x, y, {
      width: widths[4],
    });

    y += rowHeight;
  });

  // --- footer -------------------------------------------------------------
  y = Math.min(y + 10, doc.page.height - MARGIN - 10);
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).strokeColor(LINE).lineWidth(1).stroke();
  doc.font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      "Scrum Master report — tasks selected by creation time within the period.",
      MARGIN,
      y + 8,
      { width: contentWidth, align: "center" },
    );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const date = parseDateKey(url.searchParams.get("date"));
  const wantsOrg = url.searchParams.get("scope") === "org";
  const scope: ReportScope = wantsOrg && user.isOwner && user.organization ? "org" : "mine";
  const window = reportWindow(period, date);

  const data = await buildReport({
    start: window.start,
    end: window.end,
    scope,
    userId: user.id,
    organizationId: user.organization?.id ?? null,
    organizationName: user.organization?.name ?? null,
  });

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: {
        Title: `Scrum Master — ${window.label}`,
        Author: "Scrum Master",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawReport(doc, {
      period: window.period,
      label: window.label,
      scopeLabel: data.scopeLabel,
      authorName: user.profile.name,
      tasks: data.tasks,
      summary: data.summary,
    });

    doc.end();
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${window.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
