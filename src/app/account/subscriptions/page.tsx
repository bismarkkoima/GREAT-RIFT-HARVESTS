import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDayLong, formatKsh, statusLabel } from "@/lib/format";
import { FREQUENCIES, slotLabel } from "@/lib/delivery";
import { deliveryFeeFor } from "@/lib/pricing";
import { StatusBadge } from "@/components/ui/status-badge";
import { cancelSubscription, pauseSubscription, resumeSubscription, skipNextDelivery } from "@/app/actions/subscriptions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export const metadata: Metadata = { title: "My subscriptions" };

export default async function MySubscriptionsPage({ searchParams }: { searchParams: Promise<{ started?: string }> }) {
  const user = await requireUser("/account/subscriptions");
  const { started } = await searchParams;
  const subs = await db.subscription.findMany({
    where: { userId: user.id },
    include: { product: true, variant: true, deliverySlot: true, orders: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <section>
      {started && (
        <p className="mb-6 rounded-2xl bg-brand-50 p-4 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
          🌷 Your subscription is set up! We&apos;ve emailed you the details.
        </p>
      )}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl">Your subscriptions</h2>
        <Link href="/subscriptions" className="btn-secondary">+ New subscription</Link>
      </div>
      {subs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-stone-500">Get fresh flowers every week, fortnight or month — and save 10%.</p>
          <Link href="/subscriptions" className="btn-primary mt-4">Start a subscription</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {subs.map((s) => {
            const subtotal = s.variant.price * s.quantity;
            const each = subtotal - Math.round((subtotal * s.discountPercent) / 100) + deliveryFeeFor(s.city, subtotal);
            return (
              <li key={s.id} className="card p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <Image src={s.product.image} alt="" width={80} height={80} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold">{s.quantity} × {s.product.name}</p>
                      <StatusBadge status={s.status === "ACTIVE" ? "DELIVERED" : s.status === "PAUSED" ? "PENDING" : "CANCELLED"}>{statusLabel(s.status)}</StatusBadge>
                    </div>
                    <p className="text-sm text-stone-500">
                      {s.variant.label} · {FREQUENCIES[s.frequency as keyof typeof FREQUENCIES]?.label ?? s.frequency} · {formatKsh(each)} per delivery
                    </p>
                    <p className="text-sm text-stone-500">To {s.name}, {s.address}, {s.city}</p>
                    {s.status === "ACTIVE" && (
                      <p className="mt-2 text-sm">
                        Next delivery: <strong>{formatDayLong(s.nextDeliveryDate)}</strong>
                        {s.deliverySlot && <> · {slotLabel(s.deliverySlot)}</>}
                      </p>
                    )}
                  </div>
                </div>
                {s.status !== "CANCELLED" && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
                    {s.status === "ACTIVE" ? (
                      <>
                        <form action={skipNextDelivery.bind(null, s.id)}><button className="btn-secondary px-4 py-2 text-xs">Skip next delivery</button></form>
                        <form action={pauseSubscription.bind(null, s.id)}><button className="btn-secondary px-4 py-2 text-xs">Pause</button></form>
                      </>
                    ) : (
                      <form action={resumeSubscription.bind(null, s.id)}><button className="btn-primary px-4 py-2 text-xs">Resume</button></form>
                    )}
                    <form action={cancelSubscription.bind(null, s.id)}>
                      <ConfirmButton message="Cancel this subscription? Deliveries already scheduled will still arrive." className="btn-secondary px-4 py-2 text-xs text-blush-600">
                        Cancel subscription
                      </ConfirmButton>
                    </form>
                  </div>
                )}
                {s.orders.length > 0 && (
                  <p className="mt-3 text-xs text-stone-500">
                    Recent deliveries:{" "}
                    {s.orders.map((o, i) => (
                      <span key={o.id}>
                        {i > 0 && ", "}
                        <Link href={`/order/${o.token}`} className="hover:underline">{o.orderNumber}</Link>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
