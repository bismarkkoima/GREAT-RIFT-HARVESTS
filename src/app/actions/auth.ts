"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
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
