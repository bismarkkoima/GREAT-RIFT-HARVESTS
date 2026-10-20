"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { TrashIcon } from "@/components/ui/icons";
import { formatKsh } from "@/lib/format";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";

export function CartView() {
  const { items, subtotal, setQuantity, remove, ready } = useCart();
  if (!ready) return <div className="card h-40 animate-pulse" />;
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-5xl">🌷</p>
        <p className="mt-3 text-stone-500">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-6">Browse flowers</Link>
      </div>
    );
  }
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <ul className="card divide-y divide-stone-200 lg:col-span-2 dark:divide-stone-800">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 p-5">
            <Image src={item.image} alt={item.name} width={112} height={112} className="h-28 w-28 rounded-2xl object-cover" />
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/shop/${item.slug}`} className="font-display text-lg font-semibold hover:underline">{item.name}</Link>
                  <p className="text-sm text-stone-500">{item.variantLabel} · {formatKsh(item.price)} each</p>
                </div>
                <p className="font-semibold">{formatKsh(item.price * item.quantity)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <QuantityStepper value={item.quantity} onChange={(n) => setQuantity(item.variantId, n)} />
                <button onClick={() => remove(item.variantId)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-blush-600">
                  <TrashIcon /> Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="card h-fit space-y-4 p-6">
        <h2 className="text-xl">Order summary</h2>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {subtotal >= FREE_DELIVERY_THRESHOLD ? "You've unlocked free delivery 🎉" : `${formatKsh(FREE_DELIVERY_THRESHOLD - subtotal)} away from free delivery`}
          </p>
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>{formatKsh(subtotal)}</span>
        </div>
        <Link href="/checkout" className="btn-primary w-full py-3">Proceed to checkout</Link>
        <Link href="/shop" className="block text-center text-sm text-brand-700 hover:underline dark:text-brand-400">Continue shopping</Link>
      </aside>
    </div>
  );
}
