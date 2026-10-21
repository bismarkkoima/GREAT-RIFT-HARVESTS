import Link from "next/link";
import { addDays, getDeliverySchedule, isDateKey, nairobiNow, slotLabel } from "@/lib/delivery";
import { formatDayLong, formatKsh, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { SlotForm } from "./slot-form";
import { PrintButton } from "./print-button";

export default async function AdminDeliveries({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const today = nairobiNow().dateKey;
  const { date: raw = "" } = await searchParams;
  const date = isDateKey(raw) ? raw : today;
  const { slots, orders } = await getDeliverySchedule(date);

  const groups = [
    ...slots.map((s) => ({ key: s.id, title: slotLabel(s), capacity: s.capacity, orders: orders.filter((o) => o.deliverySlotId === s.id) })),
    { key: "none", title: "No time chosen", capacity: null, orders: orders.filter((o) => !o.deliverySlotId || !slots.some((s) => s.id === o.deliverySlotId)) },
  ].filter((g) => g.capacity !== null || g.orders.length > 0);

  const asap = orders.length === 0 && date === today;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold">Deliveries</h1>
          <p className="text-stone-500">{formatDayLong(`${date}T09:00:00+03:00`)} · {orders.length} {orders.length === 1 ? "delivery" : "deliveries"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/deliveries?date=${addDays(date, -1)}`} className="btn-secondary px-3">←</Link>
          <form className="flex gap-2">
            <input type="date" name="date" defaultValue={date} className="input w-auto" aria-label="Date" />
            <button className="btn-secondary">Go</button>
          </form>
          <Link href={`/admin/deliveries?date=${addDays(date, 1)}`} className="btn-secondary px-3">→</Link>
          {date !== today && <Link href="/admin/deliveries" className="btn-secondary">Today</Link>}
          <PrintButton />
        </div>
      </div>
      <h1 className="hidden text-2xl print:block">Deliveries · {formatDayLong(`${date}T09:00:00+03:00`)}</h1>

      {groups.map((g) => (
        <section key={g.key} className="card break-inside-avoid p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">{g.title}</h2>
            <span className="text-sm text-stone-500">{g.orders.length}{g.capacity !== null && ` / ${g.capacity}`} booked</span>
          </div>
          {g.orders.length === 0 ? (
            <p className="text-sm text-stone-500">No deliveries.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {g.orders.map((o) => (
                <li key={o.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_1.4fr_auto]">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium text-brand-700 hover:underline dark:text-brand-400">{o.orderNumber}</Link>
                    {o.subscriptionId && <span className="badge ml-2 bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">Subscription</span>}
                    <p>{o.name} · <a href={`tel:+${o.phone}`} className="hover:underline">+{o.phone}</a></p>
                    <p className="text-stone-500">{o.address}, {o.city}</p>
                  </div>
                  <div>
                    <p>{o.items.map((i) => `${i.quantity} × ${i.name} (${i.variantLabel})`).join(", ")}</p>
                    {o.giftMessage && <p className="italic text-stone-500">💌 “{o.giftMessage}”</p>}
                    {o.notes && <p className="text-stone-500">📝 {o.notes}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <StatusBadge status={o.status}>{statusLabel(o.status)}</StatusBadge>
                    <span className="text-xs text-stone-500">
                      {o.paymentMethod === "CASH" ? `Collect ${formatKsh(o.total)} cash` : `M-Pesa · ${statusLabel(o.paymentStatus)}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {asap && <p className="text-sm text-stone-500">Orders without a date (“as soon as possible”) are in the Orders list.</p>}

      <section className="print:hidden">
        <h2 className="mb-4 text-2xl">Delivery time slots</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((s) => <SlotForm key={s.id} slot={s} />)}
          <SlotForm />
        </div>
      </section>
    </div>
  );
}
