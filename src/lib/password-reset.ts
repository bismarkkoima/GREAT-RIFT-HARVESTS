import "server-only";
import { createHash } from "crypto";
import { db } from "./db";

export const RESET_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findValidResetToken(token: string) {
  if (!token) return null;
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}
