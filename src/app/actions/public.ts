"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { adminRecipients, sendEmail } from "@/lib/notify";
import { adminContactEmail } from "@/lib/emails";
import type { ActionState } from "./types";

async function clientKey(prefix: string) {
  const h = await headers();
  return `${prefix}:${h.get("x-forwarded-for")?.split(",")[0] ?? "local"}`;
}

export async function subscribeNewsletter(_: ActionState, form: FormData): Promise<ActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Please enter a valid email." };
  if (!rateLimit(await clientKey("newsletter"), 5)) return { error: "Too many attempts, try again shortly." };
  await db.newsletterSubscriber.upsert({ where: { email: email.data }, update: {}, create: { email: email.data } });
  return { ok: true };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(100),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, "Please add a subject.").max(150),
  message: z.string().trim().min(10, "Your message is a little short.").max(5000),
});

export async function sendContactMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!rateLimit(await clientKey("contact"), 3)) return { error: "Too many messages, please try again in a minute." };
  await db.contactMessage.create({ data: { ...parsed.data, phone: parsed.data.phone || null } });
  after(async () => {
    const msg = adminContactEmail(parsed.data);
    await Promise.all((await adminRecipients()).map((to) => sendEmail({ to, ...msg })));
  });
  return { ok: true, message: "Thanks for reaching out! We'll get back to you within one business day." };
}
