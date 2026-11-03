import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import nodemailer from "nodemailer";

import { createAdminClient } from "@/lib/supabase/admin";

export type MailTransport = "log" | "resend" | "smtp";

export interface MailResult {
  ok: boolean;
  transport: MailTransport;
  error?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  userId?: string | null;
}

function fromAddress(): string {
  return process.env.MAIL_FROM || "Scrum Master <no-reply@scrummaster.local>";
}

export function mailTransport(): MailTransport {
  if (process.env.SMTP_HOST) {
    return "smtp";
  }

  if (process.env.RESEND_API_KEY) {
    return "resend";
  }

  return "log";
}

export function mailIsConfigured(): boolean {
  const transport = mailTransport();

  if (transport === "smtp") {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  }

  if (transport === "resend") {
    return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
  }

  return true;
}

/**
 * Deliver one message and record the attempt in email_log.
 *
 * A broken mail setup must never take a page down, so failures are returned as
 * a readable message instead of being thrown.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const transport = mailTransport();
  const to = message.to.trim().replace(/[\r\n]/g, "");
  const subject = message.subject.trim().replace(/[\r\n]/g, " ");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, transport, error: "That email address is not valid." };
  }

  let result: MailResult;

  try {
    if (transport === "smtp") {
      result = await sendSmtp(to, subject, message.text, message.html);
    } else if (transport === "resend") {
      result = await sendResend(to, subject, message.text, message.html);
    } else {
      result = await sendLog(to, subject, message.text);
    }
  } catch (error) {
    result = {
      ok: false,
      transport,
      error: error instanceof Error ? error.message : "Unknown mail error.",
    };
  }

  await recordEmail({
    userId: message.userId ?? null,
    to,
    subject,
    transport,
    status: result.ok ? (transport === "log" ? "logged" : "sent") : "failed",
    error: result.error ?? null,
  });

  return result;
}

async function sendLog(to: string, subject: string, text: string): Promise<MailResult> {
  const entry =
    `===== ${new Date().toISOString()} =====\n` +
    `From: ${fromAddress()}\n` +
    `To: ${to}\n` +
    `Subject: ${subject}\n\n` +
    `${text}\n\n`;

  try {
    const storage = path.join(process.cwd(), "storage");
    await mkdir(storage, { recursive: true });
    await appendFile(path.join(storage, "mail.log"), entry, "utf8");
  } catch {
    // Read-only hosting (e.g. a serverless filesystem): the email_log table is
    // still written below, so the message remains inspectable.
  }

  return { ok: true, transport: "log" };
}

async function sendResend(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<MailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    return {
      ok: false,
      transport: "resend",
      error: `Resend refused the message (${response.status})${body ? `: ${body.slice(0, 300)}` : ""}`,
    };
  }

  return { ok: true, transport: "resend" };
}

async function sendSmtp(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<MailResult> {
  const secureMode = (process.env.SMTP_SECURE || "tls").toLowerCase();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: secureMode === "ssl",
    requireTLS: secureMode === "tls",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || "",
        }
      : undefined,
  });

  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  return { ok: true, transport: "smtp" };
}

async function recordEmail(entry: {
  userId: string | null;
  to: string;
  subject: string;
  transport: MailTransport;
  status: "sent" | "logged" | "failed";
  error: string | null;
}): Promise<void> {
  try {
    await createAdminClient().from("email_log").insert({
      user_id: entry.userId,
      to_email: entry.to,
      subject: entry.subject,
      transport: entry.transport,
      status: entry.status,
      error: entry.error,
    });
  } catch (error) {
    console.error("[mail] could not write email_log", error);
  }
}
