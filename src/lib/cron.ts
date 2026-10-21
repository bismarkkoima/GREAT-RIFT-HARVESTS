import "server-only";
import { timingSafeEqual } from "crypto";

// Scheduled jobs authenticate with "Authorization: Bearer <CRON_SECRET>" (what Vercel Cron sends).
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
