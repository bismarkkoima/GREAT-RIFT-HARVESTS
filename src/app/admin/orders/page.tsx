import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ORDER_STATUSES, formatDate, formatKsh, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(q && { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q } }] }),
  };
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Orders</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...ORDER_STATUSES].map((s) => (
          <Link key={s || "all"} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} className={`btn px-3 py-1.5 text-xs ${status === s ? "bg-brand-700 text-white" : "btn-secondary"}`}>
            {s ? statusLabel(s) : "All"}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search number, name, phone…" className="input w-64" aria-label="Search orders" />
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-stone-800">
            <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Date</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-stone-500">No orders found.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                <td className="p-4"><Link href={`/admin/orders/${o.id}`} className="font-mono font-medium text-brand-700 hover:underline dark:text-brand-400">{o.orderNumber}</Link></td>
                <td className="p-4">{o.name}<span className="block text-xs text-stone-500">{o.city}</span></td>
                <td className="p-4 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                <td className="p-4"><StatusBadge status={o.paymentStatus}>{o.paymentMethod === "MPESA" ? "M-Pesa" : "Cash"} · {statusLabel(o.paymentStatus)}</StatusBadge></td>
                <td className="p-4"><StatusBadge status={o.status}>{statusLabel(o.status)}</StatusBadge></td>
                <td className="p-4 text-right font-medium whitespace-nowrap">{formatKsh(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
