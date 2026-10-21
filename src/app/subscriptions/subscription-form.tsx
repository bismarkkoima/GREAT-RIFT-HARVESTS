"use client";

import Image from "next/image";
import { useState } from "react";
import { createSubscription } from "@/app/actions/subscriptions";
import { useFormAction } from "@/components/ui/use-form-action";
import { DeliveryPicker } from "@/components/delivery/delivery-picker";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { formatKsh } from "@/lib/format";
import { deliveryFeeFor } from "@/lib/pricing";

type Product = { id: string; name: string; image: string; variants: { id: string; label: string; price: number }[] };

const FREQUENCIES = [
  { id: "WEEKLY", label: "Every week", perMonth: 52 / 12 },
  { id: "FORTNIGHTLY", label: "Every 2 weeks", perMonth: 26 / 12 },
  { id: "MONTHLY", label: "Every month", perMonth: 1 },
];

export function SubscriptionForm({
  products,
  user,
  cities,
  discount,
  minDate,
  maxDate,
  simulated,
}: {
  products: Product[];
  user: { name: string; phone: string };
  cities: string[];
  discount: number;
  minDate: string;
  maxDate: string;
  simulated: boolean;
}) {
  const [state, action, pending] = useFormAction(createSubscription);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId) ?? products[0];
  const [variantId, setVariantId] = useState(product?.variants[0]?.id ?? "");
  const variant = product?.variants.find((v) => v.id === variantId) ?? product?.variants[0];
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState("WEEKLY");
  const [city, setCity] = useState(cities[0]);
  const [payment, setPayment] = useState<"MPESA" | "CASH">("MPESA");

  if (!product || !variant) return <p className="card p-8 text-center text-stone-500">No flowers are available for subscription right now.</p>;

  const subtotal = variant.price * quantity;
  const saving = Math.round((subtotal * discount) / 100);
  const delivery = deliveryFeeFor(city, subtotal);
  const each = subtotal - saving + delivery;
  const perMonth = Math.round(each * (FREQUENCIES.find((f) => f.id === frequency)?.perMonth ?? 1));

  return (
    <form onSubmit={action} className="grid gap-8 lg:grid-cols-3">
      <input type="hidden" name="variantId" value={variant.id} />
      <input type="hidden" name="quantity" value={quantity} />

      <div className="space-y-6 lg:col-span-2">
        <section className="card space-y-4 p-6">
          <h2 className="text-xl">1. Your flowers</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {products.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  setProductId(p.id);
                  setVariantId(p.variants[0].id);
                }}
                aria-pressed={p.id === product.id}
                className={`overflow-hidden rounded-2xl border-2 text-left transition ${p.id === product.id ? "border-brand-600" : "border-transparent hover:border-stone-300 dark:hover:border-stone-700"}`}
              >
                <Image src={p.image} alt="" width={200} height={200} className="aspect-square w-full object-cover" />
                <span className="block p-2 text-sm font-medium">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label" htmlFor="variant">Size</label>
              <select id="variant" value={variant.id} onChange={(e) => setVariantId(e.target.value)} className="input w-auto">
                {product.variants.map((v) => <option key={v.id} value={v.id}>{v.label} · {formatKsh(v.price)}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Quantity</span>
              <QuantityStepper value={quantity} onChange={(n) => setQuantity(Math.min(10, n))} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">2. How often</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {FREQUENCIES.map((f) => (
              <label key={f.id} className={`cursor-pointer rounded-2xl border-2 p-4 ${frequency === f.id ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : "border-stone-200 dark:border-stone-700"}`}>
                <input type="radio" name="frequency" value={f.id} checked={frequency === f.id} onChange={() => setFrequency(f.id)} className="sr-only" />
                <span className="font-semibold">{f.label}</span>
              </label>
            ))}
          </div>
          <DeliveryPicker minDate={minDate} maxDate={maxDate} required dateLabel="First delivery" />
          <p className="text-xs text-stone-500">Later deliveries arrive on the same weekday (or date, for monthly) and time.</p>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">3. Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Recipient name</label>
              <input id="name" name="name" required defaultValue={user.name} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone (M-Pesa)</label>
              <input id="phone" name="phone" type="tel" required defaultValue={user.phone} placeholder="0712 345 678" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address / landmark</label>
              <input id="address" name="address" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="city">Town</label>
              <select id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input">
                {cities.map((c) => <option key={c}>{c}</option>)}
                <option value="Other">Other (Ksh 500)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="giftMessage">Card message (optional)</label>
              <input id="giftMessage" name="giftMessage" maxLength={300} className="input" placeholder="Printed on every card" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">4. Payment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "MPESA" as const, title: "M-Pesa", text: "We send a payment prompt the day before each delivery." },
              { id: "CASH" as const, title: "Cash on delivery", text: "Pay the rider each time." },
            ].map((m) => (
              <label key={m.id} className={`cursor-pointer rounded-2xl border-2 p-4 ${payment === m.id ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : "border-stone-200 dark:border-stone-700"}`}>
                <input type="radio" name="paymentMethod" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="sr-only" />
                <span className="block font-semibold">{m.title}</span>
                <span className="text-sm text-stone-500">{m.text}</span>
              </label>
            ))}
          </div>
          {payment === "MPESA" && simulated && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">Demo mode: M-Pesa payments are simulated as successful.</p>
          )}
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-28">
        <h2 className="text-xl">Your subscription</h2>
        <div className="flex items-center gap-3">
          <Image src={product.image} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover" />
          <div className="text-sm">
            <p className="font-semibold">{quantity} × {product.name}</p>
            <p className="text-stone-500">{variant.label} · {FREQUENCIES.find((f) => f.id === frequency)?.label.toLowerCase()}</p>
          </div>
        </div>
        <dl className="space-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-800">
          <div className="flex justify-between"><dt>Flowers</dt><dd>{formatKsh(subtotal)}</dd></div>
          <div className="flex justify-between text-brand-700 dark:text-brand-400"><dt>Subscriber saving ({discount}%)</dt><dd>−{formatKsh(saving)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{delivery === 0 ? "Free" : formatKsh(delivery)}</dd></div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-lg font-semibold dark:border-stone-800"><dt>Per delivery</dt><dd>{formatKsh(each)}</dd></div>
          <p className="text-xs text-stone-500">About {formatKsh(perMonth)} a month. Pause, skip or cancel anytime.</p>
        </dl>
        {state?.error && <p className="rounded-xl bg-blush-50 p-3 text-sm text-blush-700 dark:bg-blush-700/20 dark:text-blush-300">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full py-3 text-base">{pending ? "Setting up…" : "Start subscription"}</button>
      </aside>
    </form>
  );
}
