"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify";
import { passwordResetEmail } from "@/lib/emails";
import { RESET_TTL_MS, findValidResetToken, hashResetToken } from "@/lib/password-reset";
import type { ActionState } from "./types";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function register(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with that email already exists." };

  const user = await db.user.create({
    data: { name, email, phone: phone || null, passwordHash: await hashPassword(password) },
  });
  // Link earlier guest orders placed with this email.
  await db.order.updateMany({ where: { email, userId: null }, data: { userId: user.id } });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`login:${ip}`, 10)) return { error: "Too many attempts. Please wait a minute." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  await createSession(user.id);
  redirect(user.role === "ADMIN" && !form.get("next") ? "/admin" : safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z.string().trim().max(20).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, phone, currentPassword, newPassword } = parsed.data;

  const data: { name: string; phone: string | null; passwordHash?: string } = { name, phone: phone || null };
  if (newPassword) {
    if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
    const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!currentPassword || !(await verifyPassword(currentPassword, full.passwordHash))) {
      return { error: "Your current password is incorrect." };
    }
    data.passwordHash = await hashPassword(newPassword);
  }
  await db.user.update({ where: { id: user.id }, data });
  revalidatePath("/account");
  return { ok: true, message: newPassword ? "Profile and password updated." : "Profile updated." };
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`reset:${ip}`, 5)) return { error: "Too many attempts. Please wait a minute." };
  // Same reply whether or not the account exists, so emails can't be probed.
  const done = { ok: true, message: "If an account exists for that email, we've sent a reset link. Check your inbox." };
  if (!z.string().email().safeParse(email).success) return done;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return done;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await sendEmail({ to: user.email, ...passwordResetEmail(user.name, `${site}/reset-password?token=${token}`) });
  return done;
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The passwords don't match." };

  const record = await findValidResetToken(token);
  if (!record) return { error: "This reset link is invalid or has expired. Please request a new one." };

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);
  await createSession(record.userId);
  redirect("/account");
}
