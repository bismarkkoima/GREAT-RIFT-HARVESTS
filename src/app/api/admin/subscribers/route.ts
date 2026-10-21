import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const subs = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
  // Quote cells and neutralise leading =,+,-,@ so spreadsheets don't run them as formulas.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const csv = ["email,subscribed_at", ...subs.map((s) => `${cell(s.email)},${s.createdAt.toISOString()}`)].join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"' },
  });
}
