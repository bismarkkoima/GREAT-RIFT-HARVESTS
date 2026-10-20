import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [unread, pending] = await Promise.all([
    db.contactMessage.count({ where: { read: false } }),
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
  ]);
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <AdminNav unread={unread} pending={pending} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
