import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { reconcilePendingPayments } from "@/lib/payments";

// Asks Safaricom about M-Pesa payments whose callback never arrived.
// Run every 5–10 minutes, e.g.:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/payments
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await reconcilePendingPayments());
}
