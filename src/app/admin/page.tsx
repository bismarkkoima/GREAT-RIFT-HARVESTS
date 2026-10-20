import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatKsh, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminDashboard() {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const counted = { status: { not: "CANCELLED" }, OR: [{ paymentStatus: "PAID" }, { paymentMethod: "CASH" }] };

  const [revenue, ordersCount, customers, recent, lowStock, topItems, monthOrders] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: counted }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.productVariant.findMany({ where: { stock: { lte: 10 } }, include: { product: true }, orderBy: { stock: "asc" }, take: 6 }),
    db.orderItem.groupBy({ by: ["name"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    db.order.findMany({ where: { ...counted, createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
  ]);

  // Revenue for the last 30 days, bucketed by day
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    return { key: d.toDateString(), label: d.getDate(), total: 0 };
  });
  for (const o of monthOrders) {
    const day = days.find((d) => d.key === o.createdAt.toDateString());
    if (day) day.total += o.total;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const monthRevenue = days.reduce((n, d) => n + d.total, 0);

  const stats = [
    { label: "Total revenue", value: formatKsh(revenue._sum.total ?? 0) },
    { label: "Last 30 days", value: formatKsh(monthRevenue) },
    { label: "Orders", value: ordersCount.toLocaleString() },
    { label: "Customers", value: customers.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="card p-6">
        <h2 className="text-lg">Revenue · last 30 days</h2>
        <div className="mt-6 flex h-40 items-end gap-1" role="img" aria-label="Daily revenue bar chart">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-brand-500 transition group-hover:bg-brand-700" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total ? 4 : 1 }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-2 py-0.5 text-xs text-white group-hover:block">
                {formatKsh(d.total)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-stone-500">
          <span>{formatDate(since)}</span>
          <span>Today</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-brand-700 hover:underline dark:text-brand-400">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-stone-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:opacity-80">
                    <span><span className="font-mono font-medium">{o.orderNumber}</span> <span className="text-sm text-stone-500">· {o.name}</span></span>
                    <StatusBadge status={o.status}>{statusLabel(o.status)}</StatusBadge>
                    <span className="font-medium">{formatKsh(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-lg">Best sellers</h2>
            {topItems.length === 0 ? <p className="text-sm text-stone-500">No sales yet.</p> : (
              <ol className="space-y-2 text-sm">
                {topItems.map((t, i) => (
                  <li key={t.name} className="flex justify-between"><span>{i + 1}. {t.name}</span><span className="font-medium">{t._sum.quantity} sold</span></li>
                ))}
              </ol>
            )}
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-lg">Low stock</h2>
            {lowStock.length === 0 ? <p className="text-sm text-stone-500">Everything is well stocked. 🌿</p> : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <Link href={`/admin/products/${v.productId}`} className="hover:underline">{v.product.name} · {v.label}</Link>
                    <span className={v.stock === 0 ? "font-semibold text-blush-600" : "text-amber-600"}>{v.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
