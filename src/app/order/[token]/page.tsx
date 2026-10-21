import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatKsh, statusLabel } from "@/lib/format";
import { cancelMyOrder, retryPayment } from "@/app/actions/checkout";
import { customerCanCancel } from "@/lib/orders";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ClearCartOnMount, PaymentPoller } from "./order-client";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = ["CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const isNew = (await searchParams).new === "1";
  const order = await db.order.findUnique({ where: { token }, include: { items: true } });
  if (!order) notFound();

  const stepIndex = STEPS.indexOf(order.status);
  const awaitingPayment = order.paymentMethod === "MPESA" && order.paymentStatus === "PENDING";
  const paymentFailed = order.paymentMethod === "MPESA" && order.paymentStatus === "FAILED" && order.status !== "CANCELLED";

  return (
    <div className="container-page max-w-4xl py-12">
      {isNew && <ClearCartOnMount />}
      {awaitingPayment && <PaymentPoller token={order.token} />}

      <div className="text-center">
        <p className="text-5xl">{order.status === "CANCELLED" ? "❌" : order.paymentStatus === "PAID" || order.paymentMethod === "CASH" ? "💐" : "📱"}</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          {isNew ? `Thank you, ${order.name.split(" ")[0]}!` : `Order ${order.orderNumber}`}
        </h1>
        <p className="mt-2 text-stone-500">Order {order.orderNumber} · placed {formatDate(order.createdAt)}</p>
        {awaitingPayment && (
          <p className="mx-auto mt-4 max-w-md rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            📱 Check your phone and enter your M-Pesa PIN to complete payment. This page updates automatically.
          </p>
        )}
        {paymentFailed && <p className="mt-4 font-medium text-blush-600">Your M-Pesa payment didn&apos;t go through.</p>}
        {paymentFailed && (
          <form action={retryPayment.bind(null, order.token)} className="mt-4">
            <button className="btn-primary">Retry M-Pesa payment</button>
          </form>
        )}
      </div>

      {order.status !== "CANCELLED" && (
        <ol className="mt-10 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`h-2 rounded-full ${i <= stepIndex ? "bg-brand-600" : "bg-stone-200 dark:bg-stone-800"}`} />
              <p className={`mt-2 text-xs sm:text-sm ${i <= stepIndex ? "font-semibold text-brand-700 dark:text-brand-400" : "text-stone-500"}`}>{statusLabel(s)}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-lg">Delivery</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-stone-500">Recipient</dt><dd>{order.name} · {order.phone}</dd></div>
            <div><dt className="text-stone-500">Address</dt><dd>{order.address}, {order.city}</dd></div>
            <div><dt className="text-stone-500">Date</dt><dd>{order.deliveryDate ? formatDate(order.deliveryDate) : "As soon as possible"}{order.deliverySlotLabel && ` · ${order.deliverySlotLabel}`}</dd></div>
            {order.giftMessage && <div><dt className="text-stone-500">Gift message</dt><dd className="italic">&ldquo;{order.giftMessage}&rdquo;</dd></div>}
          </dl>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-lg">Payment</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-stone-500">Method</dt><dd>{order.paymentMethod === "MPESA" ? "M-Pesa" : "Cash on delivery"}</dd></div>
            <div><dt className="text-stone-500">Status</dt><dd>{statusLabel(order.paymentStatus)}</dd></div>
            {order.mpesaReceipt && <div><dt className="text-stone-500">Receipt</dt><dd className="font-mono">{order.mpesaReceipt}</dd></div>}
          </dl>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-lg">Items</h2>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <Image src={i.image} alt="" width={56} height={56} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-stone-500">{i.variantLabel} × {i.quantity}</p>
              </div>
              <p className="font-medium">{formatKsh(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm dark:border-stone-800">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatKsh(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{formatKsh(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? "Free" : formatKsh(order.deliveryFee)}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-semibold"><dt>Total</dt><dd>{formatKsh(order.total)}</dd></div>
        </dl>
      </section>

      {customerCanCancel(order) && (
        <form action={cancelMyOrder.bind(null, order.token)} className="mt-6 text-center">
          <ConfirmButton message="Cancel this order?" className="text-sm font-medium text-blush-600 hover:underline">
            Cancel this order
          </ConfirmButton>
          <p className="mt-1 text-xs text-stone-500">You can cancel until our florists start preparing it.</p>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-stone-500">
        Bookmark this page to track your order, or use <Link href="/track" className="text-brand-700 hover:underline dark:text-brand-400">order tracking</Link> with your order number and email.
      </p>
    </div>
  );
}
