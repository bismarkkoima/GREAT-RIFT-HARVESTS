"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { checkCoupon, placeOrder } from "@/app/actions/checkout";
import { formatKsh } from "@/lib/format";
import { deliveryFeeFor } from "@/lib/pricing";
import { useFormAction } from "@/components/ui/use-form-action";
import { DeliveryPicker } from "@/components/delivery/delivery-picker";

type Props = {
  user: { name: string; email: string; phone: string } | null;
  cities: string[];
  simulated: boolean;
  minDate: string;
  maxDate: string;
};

export function CheckoutForm({ user, cities, simulated, minDate, maxDate }: Props) {
  const { items, subtotal, ready } = useCart();
  const [state, action, pending] = useFormAction(placeOrder);
  const [city, setCity] = useState(cities[0]);
  const [payment, setPayment] = useState<"MPESA" | "CASH">("MPESA");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checking, startCheck] = useTransition();

  if (!ready) return <div className="card h-64 animate-pulse" />;
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-stone-500">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-4">Browse flowers</Link>
      </div>
    );
  }

  // Server recalculates everything; these figures are a preview.
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const delivery = deliveryFeeFor(city, subtotal);
  const total = subtotal - discount + delivery;

  const applyCoupon = () =>
    startCheck(async () => {
      setCouponError("");
      const email = (document.getElementById("email") as HTMLInputElement | null)?.value;
      const res = await checkCoupon(couponInput, subtotal, email);
      if ("error" in res && res.error) {
        setCoupon(null);
        setCouponError(res.error);
      } else if ("code" in res && res.code) {
        setCoupon({ code: res.code, discount: res.discount });
      }
    });

  return (
    <form onSubmit={action} className="grid gap-8 lg:grid-cols-3">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })))} />
      <input type="hidden" name="coupon" value={coupon?.code ?? ""} />

      <div className="space-y-6 lg:col-span-2">
        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Contact details</h2>
          {!user && (
            <p className="text-sm text-stone-500">
              Have an account? <Link href="/login?next=/checkout" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">Sign in</Link> for faster checkout.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" required defaultValue={user?.name} className="input" autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required defaultValue={user?.email} className="input" autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone (M-Pesa)</label>
              <input id="phone" name="phone" type="tel" required defaultValue={user?.phone} placeholder="0712 345 678" className="input" autoComplete="tel" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address / landmark</label>
              <input id="address" name="address" required placeholder="Apartment, street, estate" className="input" autoComplete="street-address" />
            </div>
            <div>
              <label className="label" htmlFor="city">Town</label>
              <select id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input">
                {cities.map((c) => <option key={c}>{c}</option>)}
                <option value="Other">Other (Ksh 500)</option>
              </select>
            </div>
            <DeliveryPicker minDate={minDate} maxDate={maxDate} />
            <div className="sm:col-span-2">
              <label className="label" htmlFor="giftMessage">Gift message (optional)</label>
              <textarea id="giftMessage" name="giftMessage" rows={2} maxLength={300} placeholder="We'll handwrite this on a card 💌" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Delivery notes (optional)</label>
              <input id="notes" name="notes" maxLength={500} placeholder="Gate code, best time to call…" className="input" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Payment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "MPESA" as const, title: "M-Pesa", text: "You'll get an STK prompt on your phone." },
              { id: "CASH" as const, title: "Cash on delivery", text: "Pay cash or M-Pesa when your flowers arrive." },
            ].map((m) => (
              <label key={m.id} className={`cursor-pointer rounded-2xl border-2 p-4 ${payment === m.id ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : "border-stone-200 dark:border-stone-700"}`}>
                <input type="radio" name="paymentMethod" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="sr-only" />
                <span className="block font-semibold">{m.title}</span>
                <span className="text-sm text-stone-500">{m.text}</span>
              </label>
            ))}
          </div>
          {payment === "MPESA" && simulated && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Demo mode: M-Pesa keys aren&apos;t configured, so payments are simulated as successful.
            </p>
          )}
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-28">
        <h2 className="text-xl">Your order</h2>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.variantId} className="flex items-center gap-3 text-sm">
              <div className="relative">
                <Image src={i.image} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-700 text-[10px] text-white">{i.quantity}</span>
              </div>
              <span className="flex-1">{i.name}<span className="block text-xs text-stone-500">{i.variantLabel}</span></span>
              <span className="font-medium">{formatKsh(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Discount code" className="input" aria-label="Discount code" />
          <button type="button" onClick={applyCoupon} disabled={checking || !couponInput} className="btn-secondary">Apply</button>
        </div>
        {couponError && <p className="text-xs text-blush-600">{couponError}</p>}
        <dl className="space-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-800">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatKsh(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-brand-700 dark:text-brand-400"><dt>Discount ({coupon?.code})</dt><dd>−{formatKsh(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{delivery === 0 ? "Free" : formatKsh(delivery)}</dd></div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-semibold dark:border-stone-800"><dt>Total</dt><dd>{formatKsh(total)}</dd></div>
        </dl>
        {state?.error && <p className="rounded-xl bg-blush-50 p-3 text-sm text-blush-700 dark:bg-blush-700/20 dark:text-blush-300">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full py-3 text-base">
          {pending ? "Placing order…" : payment === "MPESA" ? `Pay ${formatKsh(total)} with M-Pesa` : "Place order"}
        </button>
      </aside>
    </form>
  );
}
