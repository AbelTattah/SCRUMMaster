"use client";

/**
 * The report body as a stand-up meeting document.
 *
 * Structure mirrors the team's written stand-up report — header block,
 * attendance, per-member progress updates, blockers & dependencies, action
 * items, meeting summary, prepared-by footer — derived **only from data the
 * app holds** (tasks, states, blockers, times, members). Titles/blockers
 * are decrypted here; the server only ever sees ciphertext, so the PDF is
 * generated in the browser with the same section layout.
 */
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";

import { ReportControls } from "@/components/ReportControls";
import { decryptText } from "@/lib/sync";
import type { ReportTask } from "@/lib/data/reports";
import type { ReportPeriod, ReportScope } from "@/lib/reportPeriods";
import { formatTime, formatTimeRange } from "@/lib/time";

const PURPLE = "#21005D";
const INK = "#1A1A1A";
const MUTED = "#727272";
const LINE = "#E4E4E4";
const GREEN = "#1E7A46";
const RED = "#B3261E";
const AMBER = "#B45309";
const MARGIN = 48;

const PERIOD_TITLE: Record<ReportPeriod, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

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
  /** "2 November – 8 November 2026" — computed server-side in the app tz. */
  periodRange: string;
  /** "6 November 2026" — today, app timezone. */
  meetingDate: string;
  orgName: string;
  authorName: string;
  tasks: ReportTask[];
  summary: ReportSummary;
}

/* --------------------------------------------------------------- grouping */

interface MemberReport {
  name: string;
  completed: ReportTask[];
  open: ReportTask[];
  blocked: ReportTask[];
}

function personOf(task: ReportTask, fallback: string): string {
  return task.assignee_name || task.creator_name || fallback;
}

/** Groups the window's tasks per person, preserving first-appearance order. */
function groupByMember(tasks: ReportTask[], fallback: string): MemberReport[] {
  const groups = new Map<string, MemberReport>();

  for (const task of tasks) {
    const name = personOf(task, fallback);
    let group = groups.get(name);

    if (!group) {
      group = { name, completed: [], open: [], blocked: [] };
      groups.set(name, group);
    }

    if (task.completed) {
      group.completed.push(task);
    } else if (task.blocker) {
      group.blocked.push(task);
    } else {
      group.open.push(task);
    }
  }

  return [...groups.values()];
}

function taskLine(task: ReportTask): string {
  const range = formatTimeRange(task.start_time, task.end_time);

  return range ? `${task.title} · ${range}` : task.title;
}

function dueLabel(task: ReportTask): string {
  return task.end_time ? `Today, ${formatTime(task.end_time)}` : "No due date";
}

function statusOf(task: ReportTask): "Blocked" | "In progress" {
  return task.blocker ? "Blocked" : "In progress";
}

function summaryStatus(summary: ReportSummary): { text: string; color: string } {
  if (summary.blocked > 0) {
    return { text: "At Risk — Monitoring Required", color: RED };
  }

  if (summary.created === 0) {
    return { text: "No activity in this period", color: MUTED };
  }

  if (summary.rate >= 60) {
    return { text: "On track", color: GREEN };
  }

  return { text: "In progress — Monitoring Required", color: AMBER };
}

/* ------------------------------------------------------------------- PDF */

function hex(value: string): [number, number, number] {
  const raw = value.replace("#", "");

  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

/** A4 portrait document with the same sections as the on-screen report. */
function buildPdf(input: {
  period: ReportPeriod;
  periodRange: string;
  meetingDate: string;
  orgName: string;
  authorName: string;
  tasks: ReportTask[];
  summary: ReportSummary;
  filename: string;
}): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cw = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (height: number) => {
    if (y + height > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const font = (style: "normal" | "bold" | "italic", size: number, color: string) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const [r, g, b] = hex(color);
    doc.setTextColor(r, g, b);
  };

  const para = (
    value: string,
    opts: {
      size?: number;
      color?: string;
      style?: "normal" | "bold" | "italic";
      indent?: number;
      bullet?: boolean;
      after?: number;
    } = {},
  ) => {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    const bullet = opts.bullet ? 12 : 0;
    const lines = doc.splitTextToSize(value, cw - indent - bullet) as string[];
    const lineHeight = size + 3.5;

    ensure(lines.length * lineHeight + (opts.after ?? 4));
    font(opts.style ?? "normal", size, opts.color ?? INK);

    for (const line of lines) {
      if (opts.bullet && line === lines[0]) {
        doc.text("•", MARGIN + indent, y + size);
      }

      doc.text(line, MARGIN + indent + bullet, y + size);
      y += lineHeight;
    }

    y += opts.after ?? 4;
  };

  const rule = () => {
    ensure(16);
    const [r, g, b] = hex(LINE);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, MARGIN + cw, y);
    y += 16;
  };

  const section = (title: string) => {
    ensure(34);
    y += 8;
    para(title.toUpperCase(), { size: 12, style: "bold", color: PURPLE, after: 6 });
  };

  const people = groupByMember(input.tasks, input.authorName);
  const blockedTasks = input.tasks.filter((task) => !task.completed && task.blocker);
  const openTasks = input.tasks.filter((task) => !task.completed);
  const status = summaryStatus(input.summary);

  // --- header --------------------------------------------------------------
  para(`${PERIOD_TITLE[input.period]} STAND-UP MEETING REPORT`, {
    size: 17,
    style: "bold",
    color: PURPLE,
    after: 6,
  });
  para(`Organization: ${input.orgName}`, { size: 10.5, after: 2 });
  para(`Reporting Period: ${input.periodRange}`, { size: 10.5, after: 2 });
  para(`Meeting Date: ${input.meetingDate}`, { size: 10.5, after: 2 });
  para(`Facilitator: ${input.authorName}`, { size: 10.5, after: 4 });
  rule();

  if (input.tasks.length === 0) {
    para("No tasks were created in this period.", {
      size: 11,
      color: MUTED,
    });
  }

  // --- 1. attendance -------------------------------------------------------
  section("1. Attendance");

  if (people.length === 0) {
    para("No progress updates were recorded in this period.", { color: MUTED });
  } else {
    para("The following team members provided progress updates:", { after: 3 });

    for (const person of people) {
      para(person.name, { bullet: true, size: 10, after: 1 });
    }
  }

  // --- 2. individual progress updates --------------------------------------
  section("2. Individual progress updates");

  for (const person of people) {
    ensure(70);
    para(person.name, { size: 11.5, style: "bold", color: PURPLE, after: 3 });
    para("Previous Progress and Accomplishments", { size: 10, style: "bold", after: 2 });

    if (person.completed.length === 0) {
      para("No completed tasks in this period.", { indent: 6, color: MUTED, size: 9.5 });
    } else {
      for (const task of person.completed) {
        para(taskLine(task), { bullet: true, indent: 6, size: 9.5, after: 1 });
      }
    }

    para("Planned Work", { size: 10, style: "bold", after: 2 });

    if (person.open.length === 0 && person.blocked.length === 0) {
      para("No planned work recorded.", { indent: 6, color: MUTED, size: 9.5 });
    } else {
      for (const task of [...person.open, ...person.blocked]) {
        para(taskLine(task), { bullet: true, indent: 6, size: 9.5, after: 1 });
      }
    }

    para("Blockers / Challenges", { size: 10, style: "bold", after: 2 });

    if (person.blocked.length === 0) {
      para("No blockers reported.", { indent: 6, color: MUTED, size: 9.5, after: 6 });
    } else {
      for (const task of person.blocked) {
        para(`${task.blocker} — “${task.title}”`, {
          bullet: true,
          indent: 6,
          size: 9.5,
          after: 1,
        });
      }

      y += 5;
    }
  }

  // --- 3. blockers and dependencies ---------------------------------------
  section("3. Blockers and dependencies");

  if (blockedTasks.length === 0) {
    para("No blockers were formally recorded in this period.", { color: MUTED });
  } else {
    blockedTasks.forEach((task, index) => {
      para(`${index + 1}. ${task.blocker}`, { size: 10.5, style: "bold", after: 1 });
      para(`Affected member: ${personOf(task, input.authorName)} · Task: ${task.title}`, {
        size: 9,
        color: MUTED,
        indent: 10,
        after: 6,
      });
    });
  }

  // --- 4. action items ------------------------------------------------------
  section("4. Action items and follow-ups");

  if (openTasks.length === 0) {
    para("No open action items in this period.", { color: MUTED });
  } else {
    for (const task of openTasks) {
      para(task.title, { size: 10, style: "bold", after: 1 });
      para(
        `Responsible: ${personOf(task, input.authorName)}  ·  Due: ${dueLabel(task)}  ·  Status: ${statusOf(task)}`,
        { size: 9, color: MUTED, indent: 10, after: 5 },
      );
    }
  }

  // --- 5. meeting summary --------------------------------------------------
  section("5. Meeting summary");
  para(`Status: ${status.text}`, { size: 11, style: "bold", color: status.color, after: 3 });
  para(
    `${input.summary.created} tasks were created, ${input.summary.completed} completed, ` +
      `${input.summary.inProgress} remain in progress` +
      (input.summary.blocked > 0
        ? `, and ${input.summary.blocked} blocked.`
        : ", with no blocked tasks formally recorded."),
    { after: 4 },
  );

  if (blockedTasks.length > 0) {
    para("Outstanding Blockers", { size: 10, style: "bold", after: 2 });

    for (const task of blockedTasks) {
      para(`${task.blocker} — ${personOf(task, input.authorName)}`, {
        bullet: true,
        size: 9.5,
        after: 1,
      });
    }
  }

  // --- footer ---------------------------------------------------------------
  rule();
  para(`Document Prepared By: ${input.authorName}`, { size: 9, color: MUTED, after: 1 });
  para("Role: Scrum Master", { size: 9, color: MUTED, after: 1 });
  para(`Date Recorded: ${input.meetingDate}`, { size: 9, color: MUTED, after: 1 });
  para(`Organization: ${input.orgName}`, { size: 9, color: MUTED });

  doc.save(input.filename);
}

/* ------------------------------------------------------------------- Word */

/** Word paragraph helpers (sizes are half-points: 21 = 10.5 pt).
 *
 * Bullets are drawn as literal "• " prefixes with a left indent rather than
 * via the numbering part — visually identical, and it removes the entire
 * list/numbering machinery from the file (the most common source of Word's
 * "unreadable content" repair prompts). Rule lines carry a space so no run
 * in the file is empty.
 */
function wordPara(
  text: string,
  opts: {
    size?: number;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    after?: number;
    before?: number;
    bullet?: boolean;
    left?: number;
    rule?: boolean;
  } = {},
): Paragraph {
  const body = opts.bullet ? `• ${text}` : text || " ";

  return new Paragraph({
    children: [
      new TextRun({
        text: body,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ? opts.color.replace("#", "") : undefined,
        size: opts.size ?? 21,
      }),
    ],
    spacing: { after: opts.after ?? 60, before: opts.before ?? 0 },
    indent: opts.left || opts.bullet ? { left: opts.left ?? 360 } : undefined,
    border: opts.rule
      ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E4E4E4", space: 6 } }
      : undefined,
  });
}

function wordPair(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 21 }),
      new TextRun({ text: value, size: 21 }),
    ],
    spacing: { after: 40 },
  });
}

/** The stand-up document as a real .docx (same sections as screen and PDF). */
async function buildDocx(input: {
  period: ReportPeriod;
  periodRange: string;
  meetingDate: string;
  orgName: string;
  authorName: string;
  tasks: ReportTask[];
  summary: ReportSummary;
  filename: string;
}): Promise<void> {
  const people = groupByMember(input.tasks, input.authorName);
  const blockedTasks = input.tasks.filter((task) => !task.completed && task.blocker);
  const openTasks = input.tasks.filter((task) => !task.completed);
  const status = summaryStatus(input.summary);

  const children: Paragraph[] = [];

  const section = (title: string) => {
    children.push(wordPara(title.toUpperCase(), {
      size: 24,
      bold: true,
      color: PURPLE,
      before: 280,
      after: 100,
    }));
  };

  // --- header --------------------------------------------------------------
  children.push(
    wordPara(`${PERIOD_TITLE[input.period]} STAND-UP MEETING REPORT`, {
      size: 34,
      bold: true,
      color: PURPLE,
      after: 140,
    }),
  );
  children.push(wordPair("Organization", input.orgName));
  children.push(wordPair("Reporting Period", input.periodRange));
  children.push(wordPair("Meeting Date", input.meetingDate));
  children.push(wordPair("Facilitator", input.authorName));
  children.push(wordPara("", { after: 40, rule: true }));

  if (input.tasks.length === 0) {
    children.push(wordPara("No tasks were created in this period.", { italics: true, color: MUTED }));
  }

  // --- 1. attendance -------------------------------------------------------
  section("1. Attendance");

  if (people.length === 0) {
    children.push(wordPara("No progress updates were recorded in this period.", { color: MUTED }));
  } else {
    children.push(wordPara("The following team members provided progress updates:", { after: 60 }));

    for (const person of people) {
      children.push(wordPara(person.name, { bullet: true, after: 30 }));
    }
  }

  // --- 2. individual progress updates --------------------------------------
  section("2. Individual progress updates");

  for (const person of people) {
    children.push(
      wordPara(person.name, { size: 23, bold: true, color: PURPLE, before: 160, after: 60 }),
    );
    children.push(wordPara("Previous Progress and Accomplishments", { size: 20, bold: true, after: 40 }));

    if (person.completed.length === 0) {
      children.push(wordPara("No completed tasks in this period.", { italics: true, color: MUTED }));
    } else {
      for (const task of person.completed) {
        children.push(wordPara(taskLine(task), { bullet: true, size: 20, after: 30 }));
      }
    }

    children.push(wordPara("Planned Work", { size: 20, bold: true, before: 80, after: 40 }));

    if (person.open.length === 0 && person.blocked.length === 0) {
      children.push(wordPara("No planned work recorded.", { italics: true, color: MUTED }));
    } else {
      for (const task of [...person.open, ...person.blocked]) {
        children.push(wordPara(taskLine(task), { bullet: true, size: 20, after: 30 }));
      }
    }

    children.push(wordPara("Blockers / Challenges", { size: 20, bold: true, before: 80, after: 40 }));

    if (person.blocked.length === 0) {
      children.push(wordPara("No blockers reported.", { italics: true, color: MUTED, after: 80 }));
    } else {
      for (const task of person.blocked) {
        children.push(
          wordPara(`${task.blocker} — “${task.title}”`, { bullet: true, size: 20, after: 30 }),
        );
      }
    }
  }

  // --- 3. blockers and dependencies ---------------------------------------
  section("3. Blockers and dependencies");

  if (blockedTasks.length === 0) {
    children.push(wordPara("No blockers were formally recorded in this period.", { color: MUTED }));
  } else {
    blockedTasks.forEach((task, index) => {
      children.push(wordPara(`${index + 1}. ${task.blocker}`, { bold: true, size: 21, after: 30 }));
      children.push(
        wordPara(
          `Affected member: ${personOf(task, input.authorName)} · Task: ${task.title}`,
          { size: 18, color: MUTED, left: 240, after: 120 },
        ),
      );
    });
  }

  // --- 4. action items ------------------------------------------------------
  section("4. Action items and follow-ups");

  if (openTasks.length === 0) {
    children.push(wordPara("No open action items in this period.", { color: MUTED }));
  } else {
    for (const task of openTasks) {
      children.push(wordPara(task.title, { bold: true, size: 21, after: 30 }));
      children.push(
        wordPara(
          `Responsible: ${personOf(task, input.authorName)}  ·  Due: ${dueLabel(task)}  ·  Status: ${statusOf(task)}`,
          { size: 18, color: MUTED, left: 240, after: 110 },
        ),
      );
    }
  }

  // --- 5. meeting summary --------------------------------------------------
  section("5. Meeting summary");
  children.push(
    wordPara(`Status: ${status.text}`, { size: 22, bold: true, color: status.color, after: 60 }),
  );
  children.push(
    wordPara(
      `${input.summary.created} tasks were created, ${input.summary.completed} completed, ` +
        `${input.summary.inProgress} remain in progress` +
        (input.summary.blocked > 0
          ? `, and ${input.summary.blocked} blocked.`
          : ", with no blocked tasks formally recorded."),
      { after: 80 },
    ),
  );

  if (blockedTasks.length > 0) {
    children.push(wordPara("Outstanding Blockers", { size: 20, bold: true, after: 40 }));

    for (const task of blockedTasks) {
      children.push(
        wordPara(`${task.blocker} — ${personOf(task, input.authorName)}`, {
          bullet: true,
          size: 20,
          after: 30,
        }),
      );
    }
  }

  // --- footer ---------------------------------------------------------------
  children.push(wordPara("", { after: 40, rule: true }));
  children.push(wordPara(`Document Prepared By: ${input.authorName}`, { size: 18, color: MUTED, after: 30 }));
  children.push(wordPara("Role: Scrum Master", { size: 18, color: MUTED, after: 30 }));
  children.push(wordPara(`Date Recorded: ${input.meetingDate}`, { size: 18, color: MUTED, after: 30 }));
  children.push(wordPara(`Organization: ${input.orgName}`, { size: 18, color: MUTED }));

  const doc = new Document({
    creator: "Scrum Master",
    title: `${PERIOD_TITLE[input.period]} stand-up meeting report`,
    description: `Stand-up report for ${input.periodRange}`,
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = input.filename.replace(/\.pdf$/, ".docx");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ----------------------------------------------------------------- screen */

export function ReportClient(props: Props) {
  const [tasks, setTasks] = useState<ReportTask[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [wordBusy, setWordBusy] = useState(false);

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
        periodRange: props.periodRange,
        meetingDate: props.meetingDate,
        orgName: props.orgName,
        authorName: props.authorName,
        tasks,
        summary: props.summary,
        filename: props.filename,
      });
    } finally {
      setDownloading(false);
    }
  }

  async function downloadWord() {
    if (!tasks || wordBusy) {
      return;
    }

    setWordBusy(true);

    try {
      await buildDocx({
        period: props.period,
        periodRange: props.periodRange,
        meetingDate: props.meetingDate,
        orgName: props.orgName,
        authorName: props.authorName,
        tasks,
        summary: props.summary,
        filename: props.filename,
      });
    } finally {
      setWordBusy(false);
    }
  }

  const people = tasks ? groupByMember(tasks, props.authorName) : [];
  const blockedTasks = tasks ? tasks.filter((t) => !t.completed && t.blocker) : [];
  const openTasks = tasks ? tasks.filter((t) => !t.completed) : [];
  const status = summaryStatus(props.summary);

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
        onDownloadWord={downloadWord}
        downloadingWord={wordBusy}
      />

      <article className="standup-doc">
        <header className="standup-head">
          <h2 className="standup-title">
            {PERIOD_TITLE[props.period]} stand-up meeting report
          </h2>
          <dl className="standup-meta">
            <div>
              <dt>Organization</dt>
              <dd>{props.orgName}</dd>
            </div>
            <div>
              <dt>Reporting period</dt>
              <dd>{props.periodRange}</dd>
            </div>
            <div>
              <dt>Meeting date</dt>
              <dd>{props.meetingDate}</dd>
            </div>
            <div>
              <dt>Facilitator</dt>
              <dd>{props.authorName}</dd>
            </div>
          </dl>
        </header>

        {tasks === null ? (
          <p className="empty">Loading report…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks were created in {props.windowLabel.toLowerCase()}.</p>
        ) : (
          <>
            <section className="standup-section">
              <h3>1. Attendance</h3>
              <p>The following team members provided progress updates:</p>
              <ul className="standup-attendance">
                {people.map((person) => (
                  <li key={person.name}>{person.name}</li>
                ))}
              </ul>
            </section>

            <section className="standup-section">
              <h3>2. Individual progress updates</h3>

              {people.map((person) => (
                <div className="standup-member" key={person.name}>
                  <h4>{person.name}</h4>

                  <h5>Previous Progress and Accomplishments</h5>
                  {person.completed.length === 0 ? (
                    <p className="standup-fallback">No completed tasks in this period.</p>
                  ) : (
                    <ul>
                      {person.completed.map((task) => (
                        <li key={task.id}>{taskLine(task)}</li>
                      ))}
                    </ul>
                  )}

                  <h5>Planned Work</h5>
                  {person.open.length === 0 && person.blocked.length === 0 ? (
                    <p className="standup-fallback">No planned work recorded.</p>
                  ) : (
                    <ul>
                      {[...person.open, ...person.blocked].map((task) => (
                        <li key={task.id}>{taskLine(task)}</li>
                      ))}
                    </ul>
                  )}

                  <h5>Blockers / Challenges</h5>
                  {person.blocked.length === 0 ? (
                    <p className="standup-fallback">No blockers reported.</p>
                  ) : (
                    <ul>
                      {person.blocked.map((task) => (
                        <li key={task.id}>
                          {task.blocker}
                          <span className="standup-taskref"> — {task.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>

            <section className="standup-section">
              <h3>3. Blockers and dependencies</h3>

              {blockedTasks.length === 0 ? (
                <p className="standup-fallback">
                  No blockers were formally recorded in this period.
                </p>
              ) : (
                blockedTasks.map((task, index) => (
                  <div className="standup-blocker" key={task.id}>
                    <p className="standup-blocker-title">
                      {index + 1}. {task.blocker}
                    </p>
                    <p className="standup-sub">
                      Affected member: {personOf(task, props.authorName)} · Task: {task.title}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="standup-section">
              <h3>4. Action items and follow-ups</h3>

              {openTasks.length === 0 ? (
                <p className="standup-fallback">No open action items in this period.</p>
              ) : (
                openTasks.map((task) => (
                  <div className="standup-action" key={task.id}>
                    <p className="standup-action-title">{task.title}</p>
                    <p className="standup-sub">
                      Responsible: {personOf(task, props.authorName)} · Due: {dueLabel(task)} ·
                      Status: {statusOf(task)}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="standup-section">
              <h3>5. Meeting summary</h3>
              <p>
                <strong className="standup-status" style={{ color: status.color }}>
                  Status: {status.text}
                </strong>
              </p>
              <p>
                The report indicates that <strong>{props.summary.created}</strong> tasks were
                created, <strong>{props.summary.completed}</strong> completed,{" "}
                <strong>{props.summary.inProgress}</strong> remain in progress
                {props.summary.blocked > 0 ? (
                  <>
                    , and <strong>{props.summary.blocked}</strong> blocked.
                  </>
                ) : (
                  ", with no blocked tasks formally recorded."
                )}
              </p>

              {blockedTasks.length > 0 ? (
                <>
                  <h5>Outstanding blockers</h5>
                  <ul>
                    {blockedTasks.map((task) => (
                      <li key={task.id}>
                        {task.blocker} — {personOf(task, props.authorName)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <footer className="standup-foot">
              <p>Document Prepared By: {props.authorName}</p>
              <p>Role: Scrum Master</p>
              <p>Date Recorded: {props.meetingDate}</p>
              <p>Organization: {props.orgName}</p>
            </footer>
          </>
        )}
      </article>
    </>
  );
}
