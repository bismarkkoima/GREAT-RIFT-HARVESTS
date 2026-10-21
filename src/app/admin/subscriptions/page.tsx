import Link from "next/link";
import { db } from "@/lib/db";
import { FREQUENCIES } from "@/lib/delivery";
import { formatDate, formatKsh, statusLabel } from "@/lib/format";
import { deliveryFeeFor } from "@/lib/pricing";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminSetSubscriptionStatus, runRenewalsNow } from "@/app/actions/subscriptions";

export default async function AdminSubscriptions() {
  const subs = await db.subscription.findMany({
    include: { product: true, variant: true, user: { select: { email: true } }, _count: { select: { orders: true } } },
    orderBy: [{ status: "asc" }, { nextDeliveryDate: "asc" }],
  });
  const active = subs.filter((s) => s.status === "ACTIVE");
  const monthly = active.reduce((n, s) => {
    const subtotal = s.variant.price * s.quantity;
    const each = subtotal - Math.round((subtotal * s.discountPercent) / 100) + deliveryFeeFor(s.city, subtotal);
    const perMonth = s.frequency === "WEEKLY" ? 52 / 12 : s.frequency === "FORTNIGHTLY" ? 26 / 12 : 1;
    return n + each * perMonth;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Subscriptions</h1>
        <form action={runRenewalsNow}>
          <button className="btn-secondary">Create due orders now</button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-stone-500">Active</p><p className="text-2xl font-semibold">{active.length}</p></div>
        <div className="card p-5"><p className="text-sm text-stone-500">Paused</p><p className="text-2xl font-semibold">{subs.filter((s) => s.status === "PAUSED").length}</p></div>
        <div className="card p-5"><p className="text-sm text-stone-500">Recurring revenue / month</p><p className="text-2xl font-semibold">{formatKsh(Math.round(monthly))}</p></div>
      </div>
      <p className="text-sm text-stone-500">Orders are created automatically the day before each delivery by the daily job. Use the button above to run it now.</p>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-stone-800">
            <tr><th className="p-4">Customer</th><th className="p-4">Flowers</th><th className="p-4">Frequency</th><th className="p-4">Next delivery</th><th className="p-4">Deliveries</th><th className="p-4">Status</th><th className="p-4" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {subs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-stone-500">No subscriptions yet.</td></tr>}
            {subs.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="p-4">{s.name}<span className="block text-xs text-stone-500">{s.user.email} · +{s.phone}</span><span className="block text-xs text-stone-500">{s.city}</span></td>
                <td className="p-4">{s.quantity} × <Link href={`/admin/products/${s.productId}`} className="hover:underline">{s.product.name}</Link><span className="block text-xs text-stone-500">{s.variant.label} · {s.paymentMethod === "CASH" ? "Cash" : "M-Pesa"}</span></td>
                <td className="p-4">{FREQUENCIES[s.frequency as keyof typeof FREQUENCIES]?.short ?? s.frequency}</td>
                <td className="p-4 whitespace-nowrap">
                  {s.status === "ACTIVE" ? formatDate(s.nextDeliveryDate) : "—"}
                  {s.lastError && <span className="mt-1 block max-w-48 whitespace-normal text-xs text-blush-600">⚠ {s.lastError}</span>}
                </td>
                <td className="p-4">{s._count.orders}</td>
                <td className="p-4"><StatusBadge status={s.status === "ACTIVE" ? "DELIVERED" : s.status === "PAUSED" ? "PENDING" : "CANCELLED"}>{statusLabel(s.status)}</StatusBadge></td>
                <td className="p-4 text-right">
                  {s.status === "ACTIVE" && (
                    <form action={adminSetSubscriptionStatus.bind(null, s.id, "PAUSED")}><button className="btn-secondary px-3 py-1 text-xs">Pause</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
