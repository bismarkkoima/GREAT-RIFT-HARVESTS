import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processDueSubscriptions } from "@/lib/subscriptions";

// Creates orders for subscription deliveries due tomorrow (or earlier).
// Call daily, e.g. from Vercel Cron or a crontab:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/subscriptions
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await processDueSubscriptions();
  return NextResponse.json({
    processed: results.length,
    created: results.filter((r) => r.outcome === "created").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    results,
  });
}
