import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ORDER_STATUSES, formatDate, formatKsh, statusLabel } from "@/lib/format";
import { checkMpesaPayment, updateOrder } from "@/app/actions/admin";
import { mpesaConfigured } from "@/lib/mpesa";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true, user: { select: { id: true, name: true } } } });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm text-stone-500 hover:underline">← Orders</Link>
          <h1 className="font-mono text-3xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-stone-500">Placed {formatDate(order.createdAt)} · {order.user ? `Customer account: ${order.user.name}` : "Guest checkout"}</p>
        </div>
        <Link href={`/order/${order.token}`} target="_blank" className="btn-secondary">Customer view</Link>
      </div>

      <form action={updateOrder.bind(null, order.id)} className="card flex flex-wrap items-end gap-4 p-6">
        <div>
          <label className="label" htmlFor="status">Order status</label>
          <select id="status" name="status" defaultValue={order.status} className="input">
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="paymentStatus">Payment status</label>
          <select id="paymentStatus" name="paymentStatus" defaultValue={order.paymentStatus} className="input">
            {["UNPAID", "PENDING", "PAID", "FAILED"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
        <button className="btn-primary">Update</button>
        <p className="w-full text-xs text-stone-500">Cancelling an order returns its items to stock.</p>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-2 p-6 text-sm">
          <h2 className="mb-2 text-lg">Customer &amp; delivery</h2>
          <p><span className="text-stone-500">Name:</span> {order.name}</p>
          <p><span className="text-stone-500">Phone:</span> <a href={`tel:+${order.phone}`} className="hover:underline">+{order.phone}</a></p>
          <p><span className="text-stone-500">Email:</span> <a href={`mailto:${order.email}`} className="hover:underline">{order.email}</a></p>
          <p><span className="text-stone-500">Address:</span> {order.address}, {order.city}</p>
          <p><span className="text-stone-500">Delivery:</span> {order.deliveryDate ? formatDate(order.deliveryDate) : "ASAP"}{order.deliverySlotLabel && ` · ${order.deliverySlotLabel}`}</p>
          {order.subscriptionId && <p><span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">Subscription delivery</span></p>}
          {order.notes && <p><span className="text-stone-500">Notes:</span> {order.notes}</p>}
          {order.giftMessage && <p className="rounded-xl bg-blush-50 p-3 italic dark:bg-blush-700/20">💌 &ldquo;{order.giftMessage}&rdquo;</p>}
        </section>
        <section className="card space-y-2 p-6 text-sm">
          <h2 className="mb-2 text-lg">Payment</h2>
          <p><span className="text-stone-500">Method:</span> {order.paymentMethod === "MPESA" ? "M-Pesa" : "Cash on delivery"}</p>
          <p><span className="text-stone-500">Status:</span> {statusLabel(order.paymentStatus)}</p>
          {order.mpesaReceipt && <p><span className="text-stone-500">Receipt:</span> <span className="font-mono">{order.mpesaReceipt}</span></p>}
          {order.paymentMethod === "MPESA" && order.paymentStatus === "PENDING" && order.mpesaCheckoutId && mpesaConfigured() && (
            <form action={checkMpesaPayment.bind(null, order.id)}>
              <button className="btn-secondary px-3 py-1.5 text-xs">Check M-Pesa status now</button>
            </form>
          )}
          <dl className="mt-4 space-y-1 border-t border-stone-200 pt-3 dark:border-stone-800">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatKsh(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt>Discount ({order.couponCode})</dt><dd>−{formatKsh(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatKsh(order.deliveryFee)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatKsh(order.total)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-lg">Items</h2>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3 text-sm">
              <Image src={i.image} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
              <span className="flex-1">{i.name} <span className="text-stone-500">· {i.variantLabel}</span></span>
              <span>{i.quantity} × {formatKsh(i.price)}</span>
              <span className="w-28 text-right font-medium">{formatKsh(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
