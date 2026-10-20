import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const subs = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "asc" } });
  const csv = ["email,subscribed_at", ...subs.map((s) => `${s.email},${s.createdAt.toISOString()}`)].join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"' },
  });
}
