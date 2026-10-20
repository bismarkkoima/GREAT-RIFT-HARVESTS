import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";

// Email (SMTP) and SMS (Africa's Talking) delivery.
// When credentials are missing, messages are printed to the server log instead,
// so the whole flow can be tried locally without accounts.

let transporter: Transporter | null = null;

function mailer() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  const transport = mailer();
  if (!transport) {
    console.log(`[email:demo] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || "Great Rift Harvests <no-reply@greatriftharvests.co.ke>",
      ...msg,
    });
  } catch (e) {
    console.error(`Email to ${msg.to} failed`, e);
  }
}

export async function sendSms(phone: string, message: string) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const to = `+${phone.replace(/\D/g, "")}`;
  if (!username || !apiKey) {
    console.log(`[sms:demo] to=${to}\n${message}\n`);
    return;
  }
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) console.error(`SMS to ${to} failed (${res.status})`, await res.text());
  } catch (e) {
    console.error(`SMS to ${to} failed`, e);
  }
}

// Store alerts go to ADMIN_NOTIFY_EMAIL (comma separated), or else to every admin account.
export async function adminRecipients(): Promise<string[]> {
  const configured = (process.env.ADMIN_NOTIFY_EMAIL || "").split(",").map((e) => e.trim()).filter(Boolean);
  if (configured.length) return configured;
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  return admins.map((a) => a.email);
}
