import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatKsh, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <h2 className="mb-4 text-2xl">Order history</h2>
        {orders.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-stone-500">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="btn-primary mt-4">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.token}`} className="card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:shadow-md">
                  <div>
                    <p className="font-mono font-semibold">{o.orderNumber}</p>
                    <p className="text-sm text-stone-500">{formatDate(o.createdAt)} · {o._count.items} {o._count.items === 1 ? "item" : "items"}</p>
                  </div>
                  <StatusBadge status={o.status}>{statusLabel(o.status)}</StatusBadge>
                  <p className="font-semibold">{formatKsh(o.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-4 text-2xl">Profile</h2>
        <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
      </section>
    </div>
  );
}
